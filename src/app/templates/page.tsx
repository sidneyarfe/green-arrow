'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/db';
import { EmailTemplate } from '@/lib/types';
import { Plus, FileText, Trash2, Search, ChevronLeft, Check, Variable, Info, Pencil } from 'lucide-react';
import { useTopbarActions } from '@/lib/topbarContext';

// Shared style for a section card
const sCard: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    overflow: 'hidden',
};

const sLabel: React.CSSProperties = {
    display: 'block', fontSize: 11.5, fontWeight: 500,
    color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
};

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formSubject, setFormSubject] = useState('');
    const [formBody, setFormBody] = useState('');
    const { setActions } = useTopbarActions();

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const data = await db.getTemplates();
                setTemplates(data);
            } catch (err) {
                console.error(err);
            }
        };
        loadTemplates();
    }, []);

    const handleCreate = useCallback(() => {
        setEditingId(null);
        setFormName('');
        setFormSubject('');
        setFormBody('');
        setView('editor');
    }, []);

    // Memoize the action button to avoid unnecessary re-renders in the Topbar
    const actionBar = useMemo(() => {
        if (view !== 'list') return null;
        return (
            <button className="btn-primary" onClick={handleCreate}>
                <Plus size={13} /> Novo Template
            </button>
        );
    }, [view, handleCreate]);

    useEffect(() => {
        setActions(actionBar);
        return () => setActions(null);
    }, [actionBar, setActions]);

    const handleEdit = useCallback((t: EmailTemplate) => {
        setEditingId(t.id);
        setFormName(t.name);
        setFormSubject(t.assunto);
        setFormBody(t.corpo);
        setView('editor');
    }, []);

    const handleSave = useCallback(async () => {
        if (!formName.trim() || !formSubject.trim() || !formBody.trim()) return;
        try {
            if (editingId) {
                const updated = await db.updateTemplate(editingId, {
                    name: formName.trim(),
                    assunto: formSubject.trim(),
                    corpo: formBody
                });
                setTemplates(prev => prev.map(t => t.id === editingId ? updated : t));
            } else {
                const added = await db.addTemplate({
                    name: formName.trim(),
                    assunto: formSubject.trim(),
                    corpo: formBody,
                });
                setTemplates(prev => [added, ...prev]);
            }
            setView('list');
        } catch (err) {
            console.error(err);
        }
    }, [editingId, formName, formSubject, formBody]);

    const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await db.deleteTemplate(id);
            setTemplates(prev => prev.filter(t => t.id !== id));
            setDeleteConfirm(null);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const insertVariable = useCallback((v: string) => {
        setFormBody(prev => prev + `{{${v}}}`);
    }, []);

    const filteredTemplates = useMemo(() => {
        return templates.filter(t =>
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.assunto.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [templates, searchTerm]);

    return (
        <div className="fade-in pb-20" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <div style={{ marginBottom: 4 }}>
                <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>Templates</h1>
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 4 }}>Laboratório de copywriting</p>
            </div>

            {view === 'editor' ? (
                <div style={sCard} className="fade-in">
                    {/* Editor header */}
                    <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button onClick={() => setView('list')} style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <ChevronLeft size={16} />
                            </button>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{editingId ? 'Editar Template' : 'Novo Template'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-ghost" onClick={() => setView('list')}>Cancelar</button>
                            <button className="btn-primary" onClick={handleSave} disabled={!formName.trim() || !formSubject.trim() || !formBody.trim()}>
                                <Check size={13} /> Salvar
                            </button>
                        </div>
                    </div>

                    {/* Editor body */}
                    <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24 }}>
                        {/* Left: fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div>
                                <label style={sLabel}>Nome Interno</label>
                                <input className="input" type="text" placeholder="Ex: Cold Mail #1 — Abordagem Direta" value={formName} onChange={e => setFormName(e.target.value)} />
                            </div>
                            <div>
                                <label style={sLabel}>Assunto do E-mail</label>
                                <input className="input" type="text" placeholder="Ex: Uma ideia para {{empresa}}..." value={formSubject} onChange={e => setFormSubject(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ ...sLabel, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Corpo do E-mail</span>
                                    <span style={{ color: 'var(--text-3)', textTransform: 'none', letterSpacing: 0 }}>Suporta HTML básico</span>
                                </label>
                                <textarea
                                    className="input"
                                    value={formBody}
                                    onChange={e => setFormBody(e.target.value)}
                                    placeholder={"Olá {{nome}},\n\nVi seu perfil no LinkedIn e..."}
                                    rows={16}
                                    style={{ resize: 'none', fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.6 }}
                                />
                            </div>
                        </div>

                        {/* Right: helpers */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                                <h4 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Variable size={13} color="var(--green)" /> Variáveis
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {['nome', 'empresa', 'cargo'].map(v => (
                                        <button key={v} onClick={() => insertVariable(v)}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                                            className="hover:border-[var(--border-2)]">
                                            <span style={{ color: 'var(--green)', fontFamily: 'var(--mono)', fontSize: 12 }}>{`{{${v}}}`}</span>
                                            <Plus size={12} color="var(--text-3)" />
                                        </button>
                                    ))}
                                </div>
                                <p style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.5 }}>Clique para inserir. Serão substituídas pelos dados da lista.</p>
                            </div>

                            <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(0,210,106,0.15)', borderRadius: 10, padding: 16 }}>
                                <h4 style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Info size={13} /> Dica Pro
                                </h4>
                                <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>Mantenha seus e-mails curtos e diretos. Perguntas simples tendem a gerar mais respostas.</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                        <input className="input" type="text" placeholder="Buscar templates..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: 36 }} />
                    </div>

                    {templates.length === 0 ? (
                        <div style={sCard}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
                                <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                    <FileText size={22} color="var(--text-3)" strokeWidth={1.5} />
                                </div>
                                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>Nenhum template criado</h3>
                                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>Crie seus modelos de e-mail para usar nas campanhas.</p>
                                <button className="btn-primary" onClick={handleCreate}><Plus size={13} /> Criar Template</button>
                            </div>
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--text-3)' }}>Nenhum resultado para &quot;{searchTerm}&quot;</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                            {filteredTemplates.map(t => (
                                <div key={t.id} onClick={() => handleEdit(t)} style={{ ...sCard, padding: 20, cursor: 'pointer', transition: 'border-color 0.15s' }} className="group hover:border-[var(--border-2)]">
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                                        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FileText size={15} color="var(--text-3)" />
                                        </div>
                                        {deleteConfirm === t.id ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                                                <button onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }} style={{ padding: '4px 6px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}><Check size={12} /></button>
                                                <button onClick={e => handleDelete(t.id, e)} style={{ padding: '4px 6px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', color: '#f87171', display: 'flex' }}><Trash2 size={12} /></button>
                                            </div>
                                        ) : (
                                            <button onClick={e => { e.stopPropagation(); setDeleteConfirm(t.id); }} style={{ opacity: 0, padding: 4, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', transition: 'all 0.15s', display: 'flex' }} className="group-hover:opacity-100 hover:!text-[#f87171]"><Trash2 size={14} /></button>
                                        )}
                                    </div>
                                    <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</h3>
                                    <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Assunto: {t.assunto}</p>
                                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--mono)', lineHeight: 1.5, border: '1px solid var(--border)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.corpo}</div>
                                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{new Date(t.createdAt).toLocaleDateString('pt-BR')}</span>
                                        <span style={{ fontSize: 10.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }} className="group-hover:!text-[var(--green)]">Editar <Pencil size={10} /></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
