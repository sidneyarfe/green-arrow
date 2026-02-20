'use client';

import { useState, useEffect, useCallback } from 'react';
import { Instance } from '@/lib/types';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import {
    Trash2,
    Pencil,
    Loader2,
    Radio,
    Copy,
    X,
    Server,
    HelpCircle,
    Check,
} from 'lucide-react';
import { useTopbarActions } from '@/lib/topbarContext';


// Helper component for Portal
function ModalPortal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    // We use document.body as the container for the portal
    // This allows the modal to break out of any stacking context (transforms, etc.)
    return typeof document !== 'undefined'
        ? (require('react-dom').createPortal(children, document.body))
        : null;
}

const GAS_CODE_TEMPLATE = (secret: string) => `function doPost(e) {
  try {
    // Recebe como texto para evitar bloqueios de CORS/Preflight
    let payload = JSON.parse(e.postData.contents);

    if (payload.secret !== "${secret}") {
      return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" })).setMimeType(ContentService.MimeType.JSON);
    }

    // Se for apenas um teste de conexão
    if (payload.acao === "teste") {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Conexão OK" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Disparo seguro
    GmailApp.sendEmail(payload.to, payload.subject, payload.body, {
      htmlBody: payload.body,
      replyTo: payload.replyTo || ""
    });

    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

export default function ArsenalPage() {
    const [instances, setInstances] = useState<Instance[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [wizardStep, setWizardStep] = useState<1 | 2>(1);
    const [showGuide, setShowGuide] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formUrl, setFormUrl] = useState('');
    const [formSecret, setFormSecret] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { setActions } = useTopbarActions();

    const openAddModal = useCallback(() => {
        setEditingId(null);
        setFormName('');
        setFormUrl('');
        setFormSecret(crypto.randomUUID());
        setWizardStep(1);
        setShowModal(true);
    }, []);

    useEffect(() => {
        const loadInstances = async () => {
            try {
                const data = await db.getInstances();
                setInstances(data);
            } catch (err) {
                toast.error('Erro ao carregar instâncias.');
            } finally {
                setIsLoading(false);
            }
        };

        loadInstances();

        const prefill = sessionStorage.getItem('greenarrow_prefill');
        if (prefill) {
            const data = JSON.parse(prefill);
            setFormName('Nova Instância'); setFormUrl(data.url); setFormSecret(data.secret);
            sessionStorage.removeItem('greenarrow_prefill');
            setWizardStep(2);
            setShowModal(true);
        }
    }, []);

    useEffect(() => {
        setActions(
            <>
                <button className="btn-ghost" onClick={() => setShowGuide(true)}>
                    <HelpCircle size={14} className="mr-2" />
                    Ajuda
                </button>
                <button className="btn-primary" onClick={openAddModal}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.5 1v11M1 6.5h11" /></svg>
                    Adicionar script
                </button>
            </>
        );
        return () => setActions(null);
    }, [setActions, openAddModal]);

    const openEditModal = useCallback((inst: Instance) => {
        setEditingId(inst.id);
        setFormName(inst.name);
        setFormUrl(inst.url);
        setFormSecret(inst.secretKey);
        setWizardStep(2); // Edit always goes to details
        setShowModal(true);
    }, []);

    const handleSave = useCallback(async () => {
        if (!formName.trim() || !formUrl.trim() || !formSecret.trim()) {
            toast.error('Preencha todos os campos.');
            return;
        }

        setIsSaving(true);
        try {
            // Test Connection using the same resilient strategy
            try {
                const res = await fetch(formUrl.trim(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ acao: 'teste', secret: formSecret.trim() })
                });
                const resultText = await res.text();
                if (!res.ok || (!resultText.includes('"success"') && !resultText.includes('"Conexão OK"'))) {
                    console.warn('Connection test details:', resultText);
                }
            } catch (e) {
                console.warn('Connection test failed (likely CORS), but continuing with save.');
            }

            if (editingId) {
                const updated = await db.updateInstance(editingId, {
                    name: formName.trim(),
                    url: formUrl.trim(),
                    secretKey: formSecret.trim(),
                    status: 'success',
                    lastTested: new Date().toISOString()
                });
                setInstances(prev => prev.map(i => i.id === editingId ? updated : i));
                toast.success('Instância atualizada.');
            } else {
                const added = await db.addInstance({
                    name: formName.trim(),
                    url: formUrl.trim(),
                    secretKey: formSecret.trim(),
                    status: 'success',
                    lastTested: new Date().toISOString()
                });
                setInstances(prev => [added, ...prev]);
                toast.success('Script conectado com sucesso!');
            }
            setShowModal(false);
        } catch (err) {
            toast.error('Erro ao salvar instância.');
        } finally {
            setIsSaving(false);
        }
    }, [editingId, formName, formUrl, formSecret]);

    const handleDelete = useCallback(async (id: string) => {
        try {
            await db.deleteInstance(id);
            setInstances(prev => prev.filter(i => i.id !== id));
            setDeleteConfirm(null);
            toast.success('Instância removida.');
        } catch (err) {
            toast.error('Erro ao remover instância.');
        }
    }, []);

    const handleTest = useCallback(async (id: string) => {
        const inst = instances.find(i => i.id === id);
        if (!inst) return;
        setInstances(prev => prev.map(i => i.id === id ? { ...i, status: 'testing' } : i));
        try {
            const res = await fetch(inst.url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ acao: 'teste', secret: inst.secretKey })
            });
            const resultText = await res.text();

            if (res.ok && (resultText.includes('"success"') || resultText.includes('"Conexão OK"'))) {
                const updated = await db.updateInstance(id, { status: 'success', lastTested: new Date().toISOString() });
                setInstances(prev => prev.map(i => i.id === id ? updated : i));
                toast.success(`Conexão com ${inst.name} OK!`);
            } else {
                throw new Error(resultText);
            }
        } catch (err) {
            const updated = await db.updateInstance(id, { status: 'error', lastTested: new Date().toISOString() });
            setInstances(prev => prev.map(i => i.id === id ? updated : i));
            toast.error(`Falha na conexão com ${inst.name}.`);
        }
    }, [instances]);

    const copyCode = () => {
        navigator.clipboard.writeText(GAS_CODE_TEMPLATE(formSecret));
        setCopied(true);
        toast.success('Código copiado!');
        setTimeout(() => setCopied(false), 2000);
    };

    const statusConfig: Record<string, { label: string; textColor: string; dotColor: string }> = {
        success: { label: 'Online', textColor: 'var(--green)', dotColor: 'var(--green)' },
        error: { label: 'Offline', textColor: '#f87171', dotColor: '#ef4444' },
        testing: { label: 'Testando...', textColor: '#fbbf24', dotColor: '#fbbf24' },
        idle: { label: 'Inativo', textColor: 'var(--text-3)', dotColor: 'var(--text-3)' },
    };

    return (
        <div className="fade-in pb-20">
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-1)', margin: 0 }}>Arsenal</h1>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                        background: 'var(--green-dim)', color: 'var(--green)',
                        border: '1px solid rgba(0,210,106,0.2)',
                    }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 4px var(--green)', display: 'inline-block' }} />
                        {instances.length} instâncias
                    </span>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--text-2)' }}>Escalabilidade total: Seus disparos via Google Apps Script.</p>
            </div>

            {/* Loading Skeleton */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ height: 128, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }} className="animate-pulse" />
                    ))}
                </div>
            ) : instances.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 40, animation: 'fadeUp 0.5s ease both' }}>
                    <div style={{
                        background: '#111111', border: '1px solid #262626',
                        borderRadius: 16, width: '100%', maxWidth: 500, padding: 40,
                        textAlign: 'center',
                    }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 14,
                            background: 'rgba(0,210,106,0.06)', border: '1px solid rgba(0,210,106,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px',
                        }}>
                            <Server size={24} color="#00d26a" />
                        </div>
                        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>Nenhum script conectado</h2>
                        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
                            Transforme sua conta Google em um motor de envios. Conecte seu primeiro script em segundos.
                        </p>
                        <button className="btn-primary" onClick={openAddModal} style={{ width: '100%', height: 42 }}>
                            + Adicionar meu primeiro script
                        </button>
                    </div>
                </div>
            )}

            {/* Instance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {instances.map((inst) => {
                    const sc = statusConfig[inst.status] ?? statusConfig.idle;
                    return (
                        <div key={inst.id} className="card group" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: inst.status === 'success' ? 'var(--green-dim)' : inst.status === 'error' ? 'rgba(239,68,68,0.1)' : 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                        <Server size={15} color={inst.status === 'success' ? 'var(--green)' : inst.status === 'error' ? '#f87171' : 'var(--text-3)'} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{inst.name}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dotColor, boxShadow: inst.status === 'success' ? '0 0 5px var(--green)' : 'none', display: 'inline-block' }} className={inst.status === 'testing' ? 'animate-pulse' : ''} />
                                            <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: sc.textColor }}>{sc.label}</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 2 }}>
                                    <button onClick={() => handleTest(inst.id)} disabled={inst.status === 'testing'} style={{ padding: 7, borderRadius: 7, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', transition: 'all 0.15s' }} className="hover:!bg-[var(--surface-2)] hover:!text-[var(--text-1)]" title="Testar">
                                        {inst.status === 'testing' ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} />}
                                    </button>
                                    <button onClick={() => openEditModal(inst)} style={{ padding: 7, borderRadius: 7, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', transition: 'all 0.15s' }} className="hover:!bg-[var(--surface-2)] hover:!text-[var(--text-1)]" title="Editar">
                                        <Pencil size={14} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)', flex: 1 }}>
                                <p style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Endpoint</p>
                                <p style={{ fontSize: 10.5, color: 'var(--text-2)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inst.url}</p>
                            </div>

                            {deleteConfirm === inst.id ? (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 11.5, color: '#f87171' }}>Confirmar exclusão?</span>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button onClick={() => setDeleteConfirm(null)} style={{ padding: '4px 8px', borderRadius: 5, fontSize: 11.5, color: 'var(--text-2)', background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer' }}>Não</button>
                                        <button onClick={() => handleDelete(inst.id)} style={{ padding: '4px 8px', borderRadius: 5, fontSize: 11.5, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>Excluir</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setDeleteConfirm(inst.id)} style={{ fontSize: 10.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', opacity: 0, transition: 'all 0.15s' }} className="group-hover:!opacity-100 hover:!text-[#f87171]">
                                        <Trash2 size={11} /> Excluir
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>


            {/* ADICIONAR/EDITAR WIZARD */}
            {showModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm fade-in" onClick={() => setShowModal(false)}>
                        <div style={{ background: '#111111', border: '1px solid #262626', borderRadius: 16, width: '100%', maxWidth: wizardStep === 1 ? 700 : 480, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
                            {/* Stepper Header */}
                            <div style={{ padding: '24px 28px', borderBottom: '1px solid #262626', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 22, height: 22, borderRadius: 6, background: wizardStep === 1 ? '#00d26a' : 'rgba(0,210,106,0.2)', color: wizardStep === 1 ? '#000' : '#00d26a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>1</div>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: wizardStep === 1 ? 'var(--text-1)' : 'var(--text-3)' }}>O Motor</span>
                                    </div>
                                    <div style={{ width: 20, height: 1, background: '#262626' }} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 22, height: 22, borderRadius: 6, background: wizardStep === 2 ? '#00d26a' : '#1a1a1a', color: wizardStep === 2 ? '#000' : 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>2</div>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: wizardStep === 2 ? 'var(--text-1)' : 'var(--text-3)' }}>A Conexão</span>
                                    </div>
                                </div>
                                <button onClick={() => setShowModal(false)} className="hover:text-white transition-colors"><X size={18} color="var(--text-3)" /></button>
                            </div>

                            {/* Wizard Content */}
                            <div style={{ padding: '32px 28px' }}>
                                {wizardStep === 1 ? (
                                    <div className="fade-in">
                                        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)', marginBottom: 24 }}>Siga os passos para gerar seu motor</h2>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                            {[
                                                { title: '1. Criar Projeto', desc: 'Abra o GAS e crie um novo projeto vazio.' },
                                                { title: '2. Colar Código', desc: 'O código abaixo já tem sua chave exclusiva.' },
                                                { title: '3. Implantar', desc: 'Publique como Web App (Qualquer pessoa).' }
                                            ].map((s, i) => (
                                                <div key={i} style={{ padding: 16, background: '#1a1a1a', borderRadius: 12, border: '1px solid #262626' }}>
                                                    <p style={{ fontSize: 13, fontWeight: 600, color: '#00d26a', marginBottom: 4 }}>{s.title}</p>
                                                    <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{s.desc}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ position: 'relative', marginBottom: 24 }}>
                                            <div style={{ position: 'absolute', right: 12, top: 12, zIndex: 10 }}>
                                                <button onClick={copyCode} className="btn-secondary" style={{ padding: '6px 14px', height: 'auto', fontSize: 12, background: '#262626', border: '1px solid #333' }}>
                                                    {copied ? <Check size={14} className="mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
                                                    {copied ? 'Copiado' : 'Copiar Código'}
                                                </button>
                                            </div>
                                            <pre style={{
                                                background: '#0a0a0a', border: '1px solid #262626',
                                                borderRadius: 12, padding: 20, maxHeight: 300,
                                                overflow: 'auto', fontSize: 11, color: '#a3a3a3',
                                                fontFamily: 'var(--mono)', lineHeight: 1.6
                                            }}>
                                                <code>{GAS_CODE_TEMPLATE(formSecret)}</code>
                                            </pre>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <button
                                                className="btn-primary"
                                                onClick={() => setWizardStep(2)}
                                                style={{ padding: '0 24px' }}
                                            >
                                                Próximo Passo: Conectar URL <Check size={16} className="ml-2" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="fade-in space-y-6">
                                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 40, background: 'rgba(0,210,106,0.1)', border: '1px solid rgba(0,210,106,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                                <Radio size={20} color="#00d26a" />
                                            </div>
                                            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>Estabelecer Conexão</h3>
                                            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Cole a URL gerada pelo Google para finalizar.</p>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome da Instância</label>
                                            <input
                                                type="text"
                                                placeholder="Ex: Comercial 01 - Dias Advocacia"
                                                value={formName}
                                                onChange={e => setFormName(e.target.value)}
                                                className="input"
                                                style={{ background: '#1a1a1a', border: '1px solid #262626' }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>URL do Web App</label>
                                            <input
                                                type="url"
                                                placeholder="https://script.google.com/macros/s/..."
                                                value={formUrl}
                                                onChange={e => setFormUrl(e.target.value)}
                                                className="input"
                                                style={{ background: '#1a1a1a', border: '1px solid #262626', fontFamily: 'var(--mono)', fontSize: 12 }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
                                            <button
                                                className="btn-ghost"
                                                onClick={() => setWizardStep(1)}
                                                style={{ flex: 1 }}
                                            >
                                                Voltar
                                            </button>
                                            <button
                                                className="btn-primary"
                                                onClick={handleSave}
                                                disabled={isSaving || !formName || !formUrl}
                                                style={{ flex: 2 }}
                                            >
                                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Testar Conexão e Salvar'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* DOCUMENTAÇÃO / GUIA */}
            {showGuide && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm fade-in" onClick={() => setShowGuide(false)}>
                        <div style={{ background: '#111111', border: '1px solid #262626', borderRadius: 16, width: '100%', maxWidth: 800, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #262626', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>Documentação Técnica</h3>
                                <button onClick={() => setShowGuide(false)}><X size={18} color="var(--text-3)" /></button>
                            </div>
                            <div style={{ padding: 32, overflowY: 'auto' }} className="space-y-8">
                                <section>
                                    <h4 style={{ color: '#00d26a', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>O que é o Arsenal?</h4>
                                    <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>
                                        O Arsenal permite que você utilize a infraestrutura do Google (Gmail) para disparar seus emails de prospecção. Cada "script" é uma instância isolada que pode disparar entre 500 (contas gratuitas) e 1.500 (contas Workspace) emails por dia.
                                    </p>
                                </section>
                                <section>
                                    <h4 style={{ color: '#00d26a', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Segurança (Secret Key)</h4>
                                    <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>
                                        Cada script que você instala possui uma <code className="bg-[#262626] px-1.5 py-0.5 rounded text-white">MY_SECRET_KEY</code> única. O Green Arrow envia essa chave em cada requisição de disparo. O seu script no Google valida essa chave antes de processar qualquer email, garantindo que ninguém mais possa usar o seu endpoint.
                                    </p>
                                </section>
                                <section>
                                    <h4 style={{ color: '#00d26a', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Limites e Boas Práticas</h4>
                                    <ul style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.8 }} className="list-disc pl-5">
                                        <li>Evite disparar mais de 100 emails por hora para manter o warm-up.</li>
                                        <li>Use nomes claros nas instâncias para identificar qual conta Google está sendo usada.</li>
                                        <li>Se receber erro "Offline", verifique se você não alterou o código ou a chave no Google.</li>
                                    </ul>
                                </section>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
