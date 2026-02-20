'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Copy,
    Check,
    ChevronRight,
    Code2,
    Globe,
    Link2,
    ArrowLeft,
    ArrowRight,
} from 'lucide-react';

const GAS_CODE = (secret: string) => `/**
 * GREEN ARROW — Motor de Envio
 * Cole este código no Google Apps Script,
 * salve e publique como Web App.
 */

const API_SECRET = "${secret}";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.secret !== API_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Acesso Negado"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.acao === "teste") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Conexão estabelecida com sucesso!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const lead = data.lead;
    const template = data.template;
    const responderPara = data.responderPara;

    let corpoPersonalizado = template.corpo.replace(/{{nome}}/g, lead.nome || "cliente");

    GmailApp.sendEmail(lead.email, template.assunto, corpoPersonalizado, {
      replyTo: responderPara
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      emailEnviado: lead.email
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (erro) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: erro.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

export default function GuiaPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [generatedSecret] = useState(() => crypto.randomUUID());
    const [copied, setCopied] = useState(false);
    const [webAppUrl, setWebAppUrl] = useState('');

    const handleCopy = async () => {
        await navigator.clipboard.writeText(GAS_CODE(generatedSecret));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFinish = () => {
        if (webAppUrl.trim()) {
            sessionStorage.setItem('greenarrow_prefill', JSON.stringify({
                url: webAppUrl.trim(),
                secret: generatedSecret,
            }));
        }
        router.push('/');
    };

    const stepLabels = [
        { label: 'Criar Script', icon: Code2 },
        { label: 'Publicar', icon: Globe },
        { label: 'Vincular', icon: Link2 },
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-8 fade-in pb-10">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-semibold text-text tracking-tight">Configuração</h2>
                <p className="text-text-muted text-sm mt-1">Conecte sua conta Gmail em 3 passos</p>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-0 w-full max-w-sm">
                {stepLabels.map((s, i) => {
                    const isActive = step === i;
                    const isPast = step > i;

                    return (
                        <div key={i} className="flex items-center flex-1 last:flex-none">
                            <button
                                onClick={() => { if (isPast) setStep(i); }}
                                className="flex items-center gap-2 group"
                                disabled={!isPast && !isActive}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-150 shrink-0 ${isActive ? 'bg-primary text-bg' :
                                    isPast ? 'bg-primary/20 text-primary' :
                                        'bg-surface-alt text-text-muted'
                                    }`}>
                                    {isPast ? <Check className="w-3.5 h-3.5" /> : i + 1}
                                </div>
                                <span className={`text-sm font-medium whitespace-nowrap hidden sm:inline ${isActive ? 'text-text' :
                                    isPast ? 'text-text-secondary' :
                                        'text-text-muted'
                                    }`}>
                                    {s.label}
                                </span>
                            </button>
                            {i < stepLabels.length - 1 && (
                                <div className={`flex-1 h-px mx-4 ${isPast ? 'bg-primary/30' : 'bg-white/[0.06]'}`}></div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Step Content */}
            <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 space-y-6">
                {step === 0 && (
                    <div className="space-y-6 fade-in">
                        <div>
                            <h3 className="text-base font-semibold text-text mb-1">Criar o Script</h3>
                            <p className="text-text-muted text-sm leading-relaxed">
                                Acesse o{' '}
                                <a
                                    href="https://script.google.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    Google Apps Script
                                </a>
                                {' '}e crie um <strong className="text-text">Novo Projeto</strong>. Copie o código abaixo e cole no editor.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-text-muted font-medium">
                                    Chave de acesso: <span className="text-primary font-mono">{generatedSecret.slice(0, 12)}...</span>
                                </p>
                                <button
                                    onClick={handleCopy}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copiado!' : 'Copiar Código'}
                                </button>
                            </div>
                            <pre className="bg-bg rounded-xl p-5 text-xs text-text-secondary font-mono overflow-x-auto max-h-72 overflow-y-auto border border-white/[0.06] leading-relaxed">
                                {GAS_CODE(generatedSecret)}
                            </pre>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-white/[0.06]">
                            <button
                                onClick={() => setStep(1)}
                                className="btn-primary px-5 py-2.5 rounded-lg text-sm inline-flex items-center gap-2"
                            >
                                Próximo
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-6 fade-in">
                        <div>
                            <h3 className="text-base font-semibold text-text mb-1">Configurar e Publicar</h3>
                            <p className="text-text-muted text-sm leading-relaxed">
                                Após colar o código, siga os passos abaixo:
                            </p>
                        </div>

                        <div className="space-y-3">
                            {[
                                'Cole o código copiado no editor do Google Apps Script.',
                                'Salve o projeto (Ctrl+S) com qualquer nome.',
                                'Clique em "Implantar" → "Nova Implantação".',
                                'Em "Tipo", selecione "App da Web".',
                                'Em "Quem pode acessar", selecione "Qualquer um".',
                                'Clique em "Implantar" e autorize o acesso.',
                                'Copie a URL gerada.',
                            ].map((text, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-md bg-surface-alt text-text-muted text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                                        {i + 1}
                                    </div>
                                    <p className="text-text text-sm">{text}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between pt-4 border-t border-white/[0.06]">
                            <button
                                onClick={() => setStep(0)}
                                className="btn-secondary px-4 py-2.5 rounded-lg text-sm inline-flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Voltar
                            </button>
                            <button
                                onClick={() => setStep(2)}
                                className="btn-primary px-5 py-2.5 rounded-lg text-sm inline-flex items-center gap-2"
                            >
                                Próximo
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 fade-in">
                        <div>
                            <h3 className="text-base font-semibold text-text mb-1">Vincular ao Green Arrow</h3>
                            <p className="text-text-muted text-sm leading-relaxed">
                                Cole a URL gerada pelo Google e finalize a conexão.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-text-muted font-medium mb-1.5">URL do Web App</label>
                                <input
                                    type="url"
                                    placeholder="https://script.google.com/macros/s/..."
                                    value={webAppUrl}
                                    onChange={(e) => setWebAppUrl(e.target.value)}
                                    className="w-full bg-bg rounded-lg px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted/50 outline-none border border-white/[0.06] focus:border-primary/40 transition-colors font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-text-muted font-medium mb-1.5">Chave de Acesso (gerada automaticamente)</label>
                                <input
                                    type="text"
                                    value={generatedSecret}
                                    readOnly
                                    className="w-full bg-bg rounded-lg px-3.5 py-2.5 text-sm text-text-muted font-mono outline-none border border-white/[0.06] opacity-60 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between pt-4 border-t border-white/[0.06]">
                            <button
                                onClick={() => setStep(1)}
                                className="btn-secondary px-4 py-2.5 rounded-lg text-sm inline-flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Voltar
                            </button>
                            <button
                                onClick={handleFinish}
                                disabled={!webAppUrl.trim()}
                                className="btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2"
                            >
                                Finalizar
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
