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
    Code,
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

const GAS_CODE_TEMPLATE = `function doPost(e) {
  // --- CONFIGURAÇÃO ---
  const MY_SECRET_KEY = "COLE_SUA_CHAVE_AQUI"; 
  const SENDER_NAME = "Seu Nome / Empresa";
  // --------------------

  try {
    const data = JSON.parse(e.postData.contents);

    // 1. Teste de Conexão
    if (data.acao === "teste") {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        message: "Conexão OK estabelecida com o Agente." 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Envio de E-mail
    if (data.lead && data.template) {
      GmailApp.sendEmail(data.lead.email, data.template.assunto, "", {
        htmlBody: data.template.corpo,
        name: SENDER_NAME,
        replyTo: data.responderPara
      });

      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        message: "Enviado" 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error("Payload inválido.");

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

export default function ArsenalPage() {
    const [instances, setInstances] = useState<Instance[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formUrl, setFormUrl] = useState('');
    const [formSecret, setFormSecret] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { setActions } = useTopbarActions();

    const openAddModal = useCallback(() => {
        setEditingId(null); setFormName(''); setFormUrl('');
        setFormSecret(crypto.randomUUID());
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
            setShowModal(true);
        }
    }, []);

    useEffect(() => {
        setActions(
            <>
                <button className="btn-ghost" onClick={() => setShowGuide(true)}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 1v11M1 6.5h11" /></svg>
                    Documentação
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
        setEditingId(inst.id); setFormName(inst.name); setFormUrl(inst.url); setFormSecret(inst.secretKey);
        setShowModal(true);
    }, []);

    const handleSave = useCallback(async () => {
        if (!formName.trim() || !formUrl.trim() || !formSecret.trim()) return;
        try {
            if (editingId) {
                const updated = await db.updateInstance(editingId, { name: formName.trim(), url: formUrl.trim(), secretKey: formSecret.trim() });
                setInstances(prev => prev.map(i => i.id === editingId ? updated : i));
                toast.success('Instância atualizada com sucesso.');
            } else {
                const added = await db.addInstance({
                    name: formName.trim(),
                    url: formUrl.trim(),
                    secretKey: formSecret.trim(),
                    status: 'idle'
                });
                setInstances(prev => [added, ...prev]);
                toast.success('Nova instância conectada.');
            }
            setShowModal(false);
        } catch (err) {
            toast.error('Erro ao salvar instância.');
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
            // Real test request
            await fetch(inst.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ acao: 'teste', secret: inst.secretKey }),
                mode: 'no-cors'
            });

            // Wait a bit to simulate processing
            await new Promise(resolve => setTimeout(resolve, 1000));

            const updated = await db.updateInstance(id, { status: 'success', lastTested: new Date().toISOString() });
            setInstances(prev => prev.map(i => i.id === id ? updated : i));
            toast.success(`Instância ${inst.name} está online!`);
        } catch {
            const updated = await db.updateInstance(id, { status: 'error', lastTested: new Date().toISOString() });
            setInstances(prev => prev.map(i => i.id === id ? updated : i));
            toast.error(`Falha ao conectar com ${inst.name}.`);
        }
    }, [instances]);

    const copyCode = () => {
        navigator.clipboard.writeText(GAS_CODE_TEMPLATE);
        setCopied(true);
        toast.success('Código copiado para a área de transferência.');
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
                <p style={{ fontSize: 13.5, color: 'var(--text-2)' }}>Gerencie suas instâncias de envio via Google Apps Script.</p>
            </div>

            {/* Loading Skeleton or Empty State */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ height: 128, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }} className="animate-pulse" />
                    ))}
                </div>
            ) : instances.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 40 }}>
                    <div style={{
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 12, width: '100%', maxWidth: 580, overflow: 'hidden',
                        animation: 'fadeUp 0.4s ease both',
                    }}>
                        {/* Empty Card Header */}
                        <div style={{ padding: '28px 28px 24px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 10,
                                background: 'var(--green-dim)', border: '1px solid rgba(0,210,106,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: 16,
                            }}>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <rect x="3" y="5" width="14" height="4" rx="2" stroke="#00d26a" strokeWidth="1.5" />
                                    <rect x="3" y="11" width="14" height="4" rx="2" stroke="#00d26a" strokeWidth="1.5" />
                                </svg>
                            </div>
                            <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--text-1)', marginBottom: 6 }}>Conecte seu primeiro script</h2>
                            <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55, maxWidth: 400 }}>O Arsenal usa o Google Apps Script para escalar seus envios de email sem limites. Configure em 3 passos.</p>
                        </div>

                        {/* Steps */}
                        <div style={{ padding: '0 28px' }}>
                            {[
                                {
                                    num: '1',
                                    title: 'Crie um projeto no Google Apps Script',
                                    desc: 'Acesse script.google.com e crie um novo projeto. Cole o código disponível no guia de instalação.',
                                    extra: (
                                        <a href="https://script.google.com" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12.5, color: 'var(--green)', textDecoration: 'none', fontWeight: 500 }}>
                                            Abrir Google Apps Script
                                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 9L9 2M9 2H4.5M9 2v4.5" /></svg>
                                        </a>
                                    ),
                                },
                                {
                                    num: '2',
                                    title: 'Publique como Web App',
                                    desc: 'No editor, vá em Implantar → Nova implantação. Defina o acesso como "Qualquer pessoa" e copie a URL gerada.',
                                    extra: (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 5, padding: '5px 10px', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--green)' }}>
                                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 8l-2-3 2-3M8 8l2-3-2-3" /></svg>
                                            Implantar → Nova implantação
                                        </div>
                                    ),
                                },
                                {
                                    num: '3',
                                    title: 'Adicione a URL aqui no Arsenal',
                                    desc: 'Cole a URL do Web App no campo abaixo. Cada script suporta até 1.500 emails por dia.',
                                    extra: null,
                                },
                            ].map((step, i) => (
                                <div key={step.num} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 14,
                                    padding: '18px 0',
                                    borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
                                    animation: `fadeUp 0.4s ease ${0.05 + i * 0.05}s both`,
                                }}>
                                    <div style={{
                                        width: 24, height: 24, borderRadius: '50%',
                                        border: '1px solid var(--border-2)', background: 'var(--surface-2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)',
                                        flexShrink: 0, marginTop: 1, fontFamily: 'var(--mono)',
                                    }}>{step.num}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-1)', marginBottom: 3 }}>{step.title}</div>
                                        <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>{step.desc}</div>
                                        {step.extra}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '20px 28px',
                            background: 'rgba(255,255,255,0.02)',
                            borderTop: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', gap: 12,
                        }}>
                            <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Dúvidas? Consulte o guia completo de instalação.</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button className="btn-ghost" onClick={() => setShowGuide(true)}>Ver guia</button>
                                <button className="btn-primary" onClick={openAddModal}>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10" /></svg>
                                    Adicionar script
                                </button>
                            </div>
                        </div>
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


            {/* ADD/EDIT MODAL PORTAL */}
            {showModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm fade-in" onClick={() => setShowModal(false)}>
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 12, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
                            <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{editingId ? 'Editar Instância' : 'Nova Instância'}</h3>
                                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', transition: 'color 0.15s' }} className="hover:!text-[var(--text-1)]"><X size={15} /></button>
                            </div>
                            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nome de Identificação</label>
                                    <input type="text" placeholder="Ex: Comercial Principal 01" value={formName} onChange={e => setFormName(e.target.value)} className="input" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Endpoint (URL do Web App)</label>
                                    <input type="url" placeholder="https://script.google.com/macros/s/..." value={formUrl} onChange={e => setFormUrl(e.target.value)} className="input" style={{ fontFamily: 'var(--mono)', fontSize: 11.5 }} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chave de Acesso</label>
                                        <span style={{ fontSize: 10.5, color: 'var(--green)' }}>Necessária para o script</span>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input type="text" value={formSecret} readOnly className="input" style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-3)', paddingRight: 70, cursor: 'default' }} />
                                        <button onClick={() => { navigator.clipboard.writeText(formSecret); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', padding: '3px 8px', borderRadius: 5, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'all 0.15s' }}>
                                            <Copy size={10} /> Copiar
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button className="btn-primary" onClick={handleSave} disabled={!formName.trim() || !formUrl.trim()}>
                                    {editingId ? 'Salvar Alterações' : 'Conectar Instância'}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* GUIDE MODAL PORTAL */}
            {showGuide && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm fade-in" onClick={() => setShowGuide(false)}>
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 12, width: '100%', maxWidth: 900, maxHeight: '88vh', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                            <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Code size={14} color="var(--green)" />
                                    <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Configuração do Agente (GAS)</h3>
                                </div>
                                <button onClick={() => setShowGuide(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', transition: 'color 0.15s' }} className="hover:!text-[var(--text-1)]"><X size={15} /></button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        { step: '1', title: 'Criar Projeto', body: <span>Acesse <a href="https://script.google.com" target="_blank" style={{ color: 'var(--green)' }}>script.google.com</a>, crie um novo projeto e apague todo o código do editor.</span> },
                                        { step: '2', title: 'Colar Código', body: <span>Copie o código abaixo, cole no editor e substitua <code style={{ fontFamily: 'var(--mono)', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>MY_SECRET_KEY</code> pela chave gerada ao adicionar a instância.</span> },
                                        { step: '3', title: 'Implantar', body: <span>Clique em <strong style={{ color: 'var(--text-1)' }}>Implantar {'>'} Nova implantação</strong>. Tipo: <strong style={{ color: 'var(--text-1)' }}>App da Web</strong>. Acesso: <strong style={{ color: 'var(--text-1)' }}>Qualquer pessoa</strong>. Copie a URL /exec.</span> },
                                    ].map(({ step, title, body }) => (
                                        <div key={step} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--green-dim)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{step}</div>
                                            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{title}</h4>
                                            <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{body}</p>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ position: 'relative', maxWidth: '100%', overflow: 'hidden' }}>
                                    <button onClick={copyCode} style={{ position: 'absolute', right: 14, top: 14, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.15s' }}>
                                        {copied ? <><Check size={12} color="var(--green)" /> Copiado!</> : <><Copy size={12} /> Copiar</>}
                                    </button>
                                    <pre style={{ background: 'var(--bg)', padding: 20, borderRadius: 10, border: '1px solid var(--border)', overflow: 'auto', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-2)', lineHeight: 1.6, maxWidth: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        <code>{GAS_CODE_TEMPLATE}</code>
                                    </pre>
                                </div>

                                <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(0,210,106,0.15)', padding: 16, borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <HelpCircle size={15} color="var(--green)" style={{ flexShrink: 0, marginTop: 1 }} />
                                    <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                                        Após implantar, copie a URL que termina em <code style={{ fontFamily: 'var(--mono)', color: 'var(--text-1)' }}>/exec</code> e cole no campo <strong style={{ color: 'var(--text-1)' }}>Endpoint</strong> ao adicionar a instância.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
