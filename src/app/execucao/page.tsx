'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Instance, Lead, LogEntry, InstanceQueue, Campaign } from '@/lib/types';
import { storage } from '@/lib/storage';
import { dispatchCampaign, stopAllDispatches } from '@/lib/engine';
import {
    Activity,
    Play,
    Square,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Terminal,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function ProgressRing({ progress, size = 80, strokeWidth = 5 }: {
    progress: number;
    size?: number;
    strokeWidth?: number;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={strokeWidth}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#22C55E"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
            />
        </svg>
    );
}

function ExecucaoContent() {
    const searchParams = useSearchParams();
    const campaignId = searchParams.get('id');

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [queues, setQueues] = useState<InstanceQueue[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const [instances, setInstances] = useState<Instance[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const campaigns = storage.getCampaigns();
            let targetCampaign: Campaign | undefined;

            if (campaignId) {
                targetCampaign = campaigns.find(c => c.id === campaignId);
            } else {
                // Default to the most recently created campaign
                targetCampaign = campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            }

            if (targetCampaign) {
                setCampaign(targetCampaign);

                // Load leads for this campaign
                const allLists = storage.getLists();
                const list = allLists.find(l => l.id === targetCampaign!.config.listId);
                setLeads(list ? list.leads : []);
            }

            setInstances(storage.getInstances());
        }, 0);
        return () => clearTimeout(timer);
    }, [campaignId]);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const totalSent = queues.reduce((sum, q) => sum + q.sent, 0);
    const totalLeads = leads.length; // Use loaded leads length
    const globalProgress = totalLeads > 0 ? (totalSent / totalLeads) * 100 : 0;

    const handleStart = useCallback(async () => {
        if (!campaign || leads.length === 0) return;

        const selectedInstances = instances.filter(i =>
            campaign.config.selectedInstances.includes(i.id)
        );

        if (selectedInstances.length === 0) return;

        setIsRunning(true);
        setIsDone(false);
        setLogs([]);

        // Update campaign status
        storage.updateCampaign(campaign.id, { status: 'running' });

        await dispatchCampaign(
            selectedInstances,
            leads,
            {
                intervalMin: campaign.config.intervalMin,
                intervalMax: campaign.config.intervalMax,
                responderPara: campaign.config.responderPara,
                templates: campaign.config.templates,
            },
            {
                onQueueUpdate: (q) => setQueues([...q]),
                onLog: (entry) => setLogs(prev => [...prev.slice(-500), entry]),
                onComplete: () => {
                    setIsRunning(false);
                    setIsDone(true);
                    storage.updateCampaign(campaign.id, { status: 'done' });
                },
            }
        );
    }, [campaign, instances, leads]);

    const handleStop = useCallback(() => {
        stopAllDispatches();
        setIsRunning(false);
        if (campaign) {
            storage.updateCampaign(campaign.id, { status: 'paused' });
        }
    }, [campaign]);

    // Empty state
    if (!campaign) {
        return (
            <div className="flex flex-col items-center justify-center h-full fade-in min-h-[60vh]">
                <div className="max-w-md text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mx-auto">
                        <Activity className="w-7 h-7 text-text-muted" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-text mb-2">Nenhuma campanha encontrada</h2>
                        <p className="text-text-secondary text-sm leading-relaxed">
                            Crie uma nova campanha para monitorar a execução.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 fade-in pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-text tracking-tight">Execução: {campaign.name}</h2>
                    <p className="text-text-muted text-sm mt-1">
                        {leads.length} leads · {campaign.config.selectedInstances.length} {campaign.config.selectedInstances.length === 1 ? 'instância' : 'instâncias'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {!isRunning && !isDone && (
                        <button
                            onClick={handleStart}
                            className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2"
                        >
                            <Play className="w-4 h-4" />
                            Iniciar
                        </button>
                    )}
                    {isRunning && (
                        <button
                            onClick={handleStop}
                            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors inline-flex items-center gap-2"
                        >
                            <Square className="w-3.5 h-3.5" />
                            Parar
                        </button>
                    )}
                    {isDone && (
                        <div className="px-4 py-2.5 rounded-lg text-sm bg-primary/10 text-primary border border-primary/20 font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Concluído
                        </div>
                    )}
                </div>
            </div>

            {/* Global Stats */}
            <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 flex flex-col md:flex-row items-center gap-8">
                {/* Ring */}
                <div className="relative">
                    <ProgressRing progress={globalProgress} size={120} strokeWidth={6} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-semibold text-text tabular-nums">{Math.round(globalProgress)}%</span>
                        <span className="text-[10px] text-text-muted mt-0.5">Progresso</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex-1 grid grid-cols-3 gap-4 w-full">
                    <div className="bg-bg rounded-xl p-4 border border-white/[0.06]">
                        <p className="text-2xl font-semibold text-text tabular-nums">{totalSent} <span className="text-sm font-normal text-text-muted">/ {totalLeads}</span></p>
                        <p className="text-xs text-text-muted mt-1">Enviados</p>
                        {isRunning && (
                            <div className="mt-2 flex items-center gap-1.5 text-primary text-xs">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Enviando...</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-bg rounded-xl p-4 border border-white/[0.06]">
                        <p className="text-2xl font-semibold text-text tabular-nums">{queues.filter(q => q.status === 'sending').length}</p>
                        <p className="text-xs text-text-muted mt-1">Ativas</p>
                    </div>

                    <div className="bg-bg rounded-xl p-4 border border-white/[0.06]">
                        <p className="text-2xl font-semibold text-text tabular-nums">{queues.length}</p>
                        <p className="text-xs text-text-muted mt-1">Instâncias</p>
                    </div>
                </div>
            </div>

            {/* Instance Grid */}
            {queues.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-text-secondary mb-3">Status das Instâncias</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {queues.map((queue) => {
                            const progress = queue.total > 0 ? (queue.sent / queue.total) * 100 : 0;

                            return (
                                <div
                                    key={queue.instanceId}
                                    className={`bg-surface rounded-xl p-5 border transition-colors duration-150 ${queue.status === 'error' ? 'border-danger/20' :
                                        queue.status === 'sending' ? 'border-primary/20' :
                                            'border-white/[0.06]'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-2 h-2 rounded-full ${queue.status === 'sending' ? 'bg-primary' :
                                                queue.status === 'error' ? 'bg-danger' :
                                                    queue.status === 'done' ? 'bg-primary' : 'bg-text-muted'
                                                }`}></div>
                                            <h4 className="text-sm font-medium text-text">{queue.instanceName}</h4>
                                        </div>
                                        {queue.status === 'sending' && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                                        {queue.status === 'done' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                        {queue.status === 'error' && <AlertCircle className="w-4 h-4 text-danger" />}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-text-muted">Enviados</span>
                                            <span className="text-text font-medium tabular-nums">{queue.sent} / {queue.total}</span>
                                        </div>
                                        <div className="h-1 w-full bg-white/[0.04] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${queue.status === 'error' ? 'bg-danger' : 'bg-primary'}`}
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                        {queue.currentLead && (
                                            <p className="text-[11px] text-text-muted font-mono truncate">
                                                → {queue.currentLead}
                                            </p>
                                        )}
                                        {queue.errorMessage && (
                                            <p className="text-[11px] text-danger font-medium">{queue.errorMessage}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Log Terminal */}
            <div className="bg-surface rounded-xl border border-white/[0.06] overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Terminal className="w-4 h-4 text-text-muted" />
                        <h4 className="text-xs font-medium text-text-secondary">Log</h4>
                    </div>
                    <span className="text-[11px] text-text-muted tabular-nums">{logs.length} registros</span>
                </div>
                <div
                    ref={logContainerRef}
                    className="h-56 overflow-y-auto p-4 space-y-1 font-mono text-[11px] bg-bg"
                >
                    {logs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-text-muted/40">
                            <p>Aguardando execução...</p>
                        </div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="log-entry flex items-start gap-3 py-0.5 px-2 rounded hover:bg-white/[0.02] transition-colors">
                                <span className="text-text-muted/40 shrink-0">[{log.timestamp}]</span>
                                <span className={`shrink-0 font-medium ${log.type === 'success' ? 'text-primary' :
                                    log.type === 'error' ? 'text-danger' :
                                        log.type === 'warning' ? 'text-warning' :
                                            'text-blue-400'
                                    }`}>
                                    [{log.instanceName}]
                                </span>
                                <span className={`${log.type === 'success' ? 'text-primary/70' :
                                    log.type === 'error' ? 'text-danger/80' :
                                        'text-text-muted/70'
                                    }`}>
                                    {log.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ExecucaoPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        }>
            <ExecucaoContent />
        </Suspense>
    );
}
