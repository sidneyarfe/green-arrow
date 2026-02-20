import { Instance, Lead, EmailTemplate, DispatchPayload, LogEntry, InstanceQueue } from './types';

interface EngineConfig {
    intervalMin: number;
    intervalMax: number;
    responderPara: string;
    templates: EmailTemplate[];
}

interface EngineCallbacks {
    onQueueUpdate: (queues: InstanceQueue[]) => void;
    onLog: (entry: LogEntry) => void;
    onComplete: () => void;
}

function randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickTemplate(templates: EmailTemplate[]): EmailTemplate {
    return templates[Math.floor(Math.random() * templates.length)];
}

function personalizeTemplate(template: EmailTemplate, lead: Lead): { assunto: string; corpo: string } {
    return {
        assunto: template.assunto.replace(/\{\{nome\}\}/g, lead.nome || 'Cliente'),
        corpo: template.corpo.replace(/\{\{nome\}\}/g, lead.nome || 'Cliente'),
    };
}

function timestamp(): string {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

let abortControllers: AbortController[] = [];

export function stopAllDispatches() {
    abortControllers.forEach(c => c.abort());
    abortControllers = [];
}

export async function dispatchCampaign(
    instances: Instance[],
    leads: Lead[],
    config: EngineConfig,
    callbacks: EngineCallbacks
): Promise<void> {
    abortControllers = [];

    // Split leads evenly across instances
    const queues: InstanceQueue[] = instances.map((inst, i) => {
        const chunkSize = Math.ceil(leads.length / instances.length);
        const start = i * chunkSize;
        const chunk = leads.slice(start, start + chunkSize);
        return {
            instanceId: inst.id,
            instanceName: inst.name,
            leads: chunk,
            sent: 0,
            total: chunk.length,
            status: 'idle' as const,
        };
    });

    callbacks.onQueueUpdate([...queues]);

    const promises = queues.map((queue, queueIndex) => {
        const controller = new AbortController();
        abortControllers.push(controller);
        const instance = instances[queueIndex];

        return (async () => {
            queue.status = 'sending';
            callbacks.onQueueUpdate([...queues]);

            for (let i = 0; i < queue.leads.length; i++) {
                if (controller.signal.aborted) {
                    queue.status = 'error';
                    queue.errorMessage = 'Disparo cancelado';
                    callbacks.onQueueUpdate([...queues]);
                    return;
                }

                const lead = queue.leads[i];
                const rawTemplate = pickTemplate(config.templates);
                const template = personalizeTemplate(rawTemplate, lead);

                queue.currentLead = lead.email;
                callbacks.onQueueUpdate([...queues]);

                callbacks.onLog({
                    timestamp: timestamp(),
                    instanceName: instance.name,
                    type: 'info',
                    message: `Enviando para ${lead.nome} (${lead.email})...`,
                });

                const payload: DispatchPayload = {
                    secret: instance.secretKey,
                    lead: { nome: lead.nome, email: lead.email },
                    template: { assunto: template.assunto, corpo: template.corpo },
                    responderPara: config.responderPara,
                };

                try {
                    const res = await fetch(instance.url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        signal: controller.signal,
                        mode: 'no-cors',
                    });

                    // Google Apps Script with no-cors returns opaque response
                    // We treat any non-error response as success
                    let success = true;
                    let msg = 'Enviado com sucesso';

                    try {
                        const result = await res.json();
                        if (result.status === 'error') {
                            success = false;
                            msg = result.message || 'Erro desconhecido';
                        }
                    } catch {
                        // opaque response — assume success
                    }

                    if (success) {
                        queue.sent++;
                        callbacks.onLog({
                            timestamp: timestamp(),
                            instanceName: instance.name,
                            type: 'success',
                            message: `✓ ${lead.email} — ${msg}`,
                        });
                    } else {
                        callbacks.onLog({
                            timestamp: timestamp(),
                            instanceName: instance.name,
                            type: 'error',
                            message: `✗ ${lead.email} — ${msg}`,
                        });
                    }
                } catch (err) {
                    if (controller.signal.aborted) return;

                    callbacks.onLog({
                        timestamp: timestamp(),
                        instanceName: instance.name,
                        type: 'error',
                        message: `✗ ${lead.email} — ${(err as Error).message}`,
                    });
                }

                callbacks.onQueueUpdate([...queues]);

                // Random delay before next send (only if not the last lead)
                if (i < queue.leads.length - 1) {
                    const delay = randomDelay(config.intervalMin * 1000, config.intervalMax * 1000);
                    callbacks.onLog({
                        timestamp: timestamp(),
                        instanceName: instance.name,
                        type: 'info',
                        message: `Aguardando ${(delay / 1000).toFixed(1)}s...`,
                    });
                    await new Promise<void>((resolve) => {
                        const timer = setTimeout(resolve, delay);
                        controller.signal.addEventListener('abort', () => {
                            clearTimeout(timer);
                            resolve();
                        });
                    });
                }
            }

            queue.status = 'done';
            queue.currentLead = undefined;
            callbacks.onQueueUpdate([...queues]);
            callbacks.onLog({
                timestamp: timestamp(),
                instanceName: instance.name,
                type: 'success',
                message: `Fila concluída! ${queue.sent}/${queue.total} enviados.`,
            });
        })();
    });

    await Promise.allSettled(promises);
    callbacks.onComplete();
}
