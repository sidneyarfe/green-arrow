'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/db';
import { LeadList, Lead } from '@/lib/types';
import { parseFile, sanitizeLeads } from '@/lib/csvParser';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Users, Trash2, Search, ChevronRight, Check, AlertCircle, Loader2, X } from 'lucide-react';
import { useTopbarActions } from '@/lib/topbarContext';

const sCard: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
};
const sLabel: React.CSSProperties = {
    display: 'block', fontSize: 11.5, fontWeight: 500,
    color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
};
const sSelect: React.CSSProperties = {
    background: 'var(--surface-2)', border: '1px solid var(--border)',
    color: 'var(--text-1)', borderRadius: 8, padding: '8px 12px', fontSize: 13,
    width: '100%', outline: 'none', cursor: 'pointer',
};

export default function ListasPage() {
    const [lists, setLists] = useState<LeadList[]>([]);
    const [view, setView] = useState<'list' | 'create'>('list');
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<Record<string, string>[]>([]);
    const [mapping, setMapping] = useState({ nome: '', email: '' });
    const [listName, setListName] = useState('');
    const [processing, setProcessing] = useState(false);
    const [previewData, setPreviewData] = useState<{ leads: Lead[], total: number, valid: number, invalid: number } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [expandedList, setExpandedList] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { setActions } = useTopbarActions();

    useEffect(() => {
        const loadLists = async () => {
            try {
                const data = await db.getLists();
                setLists(data);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadLists();
    }, []);

    const openImport = useCallback(() => setView('create'), []);

    useEffect(() => {
        if (view === 'list') {
            setActions(
                <button className="btn-primary" onClick={openImport}>
                    <Upload size={13} /> Importar Lista
                </button>
            );
        } else {
            setActions(null);
        }
        return () => setActions(null);
    }, [view, setActions, openImport]);

    const handleFileDrop = async (e: React.DragEvent | React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault(); setDragOver(false);
        let uploadedFile: File | null = null;
        if ('dataTransfer' in e) uploadedFile = e.dataTransfer.files?.[0] ?? null;
        else uploadedFile = e.target.files?.[0] ?? null;
        if (!uploadedFile) return;
        setFile(uploadedFile); setProcessing(true);
        try {
            const { headers, rows } = await parseFile(uploadedFile);
            setHeaders(headers); setRows(rows);
            const lowerHeaders = headers.map(h => h.toLowerCase());
            const emailIdx = lowerHeaders.findIndex(h => h.includes('mail'));
            const nameIdx = lowerHeaders.findIndex(h => h.includes('nome') || h.includes('name') || h.includes('cliente'));
            setMapping({ email: emailIdx !== -1 ? headers[emailIdx] : '', nome: nameIdx !== -1 ? headers[nameIdx] : '' });
            if (!listName) setListName(uploadedFile.name.replace(/\.[^/.]+$/, ''));
        } catch {
            toast.error('Erro ao ler arquivo. Verifique se é um CSV válido.'); setFile(null);
        } finally { setProcessing(false); }
    };

    useEffect(() => {
        if (file && mapping.email) {
            const { leads, invalid } = sanitizeLeads(rows, mapping.nome, mapping.email);
            setPreviewData({ leads: leads.slice(0, 5), total: rows.length, valid: leads.length, invalid });
        }
    }, [mapping, file, rows]);

    const handleSaveList = async () => {
        if (!previewData || !listName.trim()) return;
        setProcessing(true);
        try {
            const { leads } = sanitizeLeads(rows, mapping.nome, mapping.email);
            const newList = await db.addList(
                listName.trim(),
                leads
            );
            setLists(prev => [newList, ...prev]);
            toast.success(`Lista "${listName}" salva com ${leads.length} leads!`);
            resetForm();
        } catch (err) {
            toast.error('Erro ao salvar lista no banco de dados.');
        } finally {
            setProcessing(false);
        }
    };

    const resetForm = () => {
        setView('list'); setFile(null); setHeaders([]); setRows([]);
        setMapping({ nome: '', email: '' }); setListName(''); setPreviewData(null);
    };

    const handleDelete = async (id: string) => {
        try {
            await db.deleteList(id);
            setLists(prev => prev.filter(l => l.id !== id));
            setDeleteConfirm(null);
            toast.success('Lista removida.');
        } catch (err) {
            toast.error('Erro ao remover lista.');
        }
    };
    const filteredLists = lists.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="fade-in pb-20" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ marginBottom: 4 }}>
                <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>Base de Alvos</h1>
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 4 }}>Gerencie suas listas de prospecção</p>
            </div>

            {view === 'create' ? (
                <div style={sCard} className="fade-in">
                    {/* Header */}
                    <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={resetForm} style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Nova Importação</span>
                    </div>

                    <div style={{ padding: 24 }}>
                        {!file ? (
                            <label
                                htmlFor="file-upload"
                                style={{ border: `2px dashed ${dragOver ? 'rgba(0,210,106,0.4)' : 'var(--border)'}`, borderRadius: 12, padding: '64px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'all 0.2s', background: dragOver ? 'var(--green-dim)' : 'transparent' }}
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleFileDrop}
                            >
                                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" id="file-upload" onChange={handleFileDrop} />
                                <div style={{ width: 52, height: 52, borderRadius: 12, background: dragOver ? 'var(--green-dim)' : 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {processing ? <Loader2 size={22} color="var(--text-3)" className="animate-spin" /> : <FileSpreadsheet size={22} color={dragOver ? 'var(--green)' : 'var(--text-3)'} />}
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>Clique ou arraste seu arquivo aqui</p>
                                    <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Suporta CSV ou Excel (.csv, .xlsx)</p>
                                </div>
                            </label>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                {/* Left: Config */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <FileSpreadsheet size={16} color="var(--green)" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                                            <p style={{ fontSize: 11.5, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{(file.size / 1024).toFixed(1)} KB · {rows.length} linhas</p>
                                        </div>
                                        <button onClick={() => setFile(null)} style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}><X size={15} /></button>
                                    </div>
                                    <div>
                                        <label style={sLabel}>Coluna de Nome</label>
                                        <select value={mapping.nome} onChange={e => setMapping({ ...mapping, nome: e.target.value })} style={sSelect}>
                                            <option value="">-- Não mapear --</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={sLabel}>Coluna de E-mail <span style={{ color: '#f87171' }}>*</span></label>
                                        <select value={mapping.email} onChange={e => setMapping({ ...mapping, email: e.target.value })} style={sSelect}>
                                            <option value="">-- Selecione --</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={sLabel}>Nome da Lista</label>
                                        <input className="input" type="text" value={listName} onChange={e => setListName(e.target.value)} placeholder="Ex: CEOs de Construtoras SP" />
                                    </div>
                                </div>

                                {/* Right: Preview */}
                                <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 18, border: '1px solid var(--border)' }}>
                                    <h4 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Pré-visualização</h4>
                                    {previewData ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                                                {[
                                                    { label: 'Total', value: previewData.total, color: 'var(--text-1)' },
                                                    { label: 'Válidos', value: previewData.valid, color: 'var(--green)' },
                                                    { label: 'Inválidos', value: previewData.invalid, color: '#f87171' },
                                                ].map(({ label, value, color }) => (
                                                    <div key={label} style={{ textAlign: 'center' }}>
                                                        <p style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{label}</p>
                                                        <p style={{ fontSize: 20, fontWeight: 600, color, marginTop: 2 }}>{value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {previewData.leads.map((l, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '7px 10px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                                                        <span style={{ color: 'var(--text-2)' }}>{l.nome || '—'}</span>
                                                        <span style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{l.email}</span>
                                                    </div>
                                                ))}
                                                {previewData.valid > 5 && <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: 4 }}>+{previewData.valid - 5} outros registros</p>}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8, textAlign: 'center' }}>
                                            <AlertCircle size={20} color="var(--text-3)" />
                                            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Selecione a coluna de email para ver a pré-visualização</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {file && (
                        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--surface-2)' }}>
                            <button className="btn-ghost" onClick={resetForm}>Cancelar</button>
                            <button className="btn-primary" onClick={handleSaveList} disabled={!previewData || !listName.trim() || (previewData?.valid ?? 0) === 0}>
                                <Check size={13} /> Salvar Lista
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                        <input className="input" type="text" placeholder="Buscar listas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: 36 }} />
                    </div>

                    {isLoading ? (
                        <div style={{ ...sCard, padding: 0 }}>
                            {[1, 2, 3].map(i => <div key={i} style={{ height: 72, borderBottom: '1px solid var(--border)' }} className="animate-pulse" />)}
                        </div>
                    ) : lists.length === 0 ? (
                        <div style={sCard}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
                                <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                    <Users size={22} color="var(--text-3)" strokeWidth={1.5} />
                                </div>
                                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>Nenhuma lista encontrada</h3>
                                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>Importe um arquivo CSV ou Excel para começar.</p>
                                <button className="btn-primary" onClick={openImport}><Upload size={13} /> Importar Lista</button>
                            </div>
                        </div>
                    ) : filteredLists.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--text-3)' }}>Nenhum resultado para &quot;{searchTerm}&quot;</p>
                    ) : (
                        <div style={{ ...sCard, padding: 0 }}>
                            {filteredLists.map(list => {
                                const isExpanded = expandedList === list.id;
                                return (
                                    <div key={list.id} style={{ borderBottom: '1px solid var(--border)' }} className="group">
                                        <div onClick={() => setExpandedList(isExpanded ? null : list.id)} style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'background 0.15s' }} className="hover:bg-[var(--surface-2)]">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <FileSpreadsheet size={15} color="var(--text-3)" />
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{list.name}</p>
                                                    <p style={{ fontSize: 11.5, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{list.leads.length} contatos · {new Date(list.createdAt).toLocaleDateString('pt-BR')}</p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {deleteConfirm === list.id ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                                                        <span style={{ fontSize: 11.5, color: '#f87171', fontWeight: 500 }}>Confirmar?</span>
                                                        <button onClick={() => setDeleteConfirm(null)} style={{ padding: 5, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}><X size={11} /></button>
                                                        <button onClick={() => handleDelete(list.id)} style={{ padding: 5, borderRadius: 6, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', color: '#f87171', display: 'flex' }}><Check size={11} /></button>
                                                    </div>
                                                ) : (
                                                    <button onClick={e => { e.stopPropagation(); setDeleteConfirm(list.id); }} style={{ padding: 6, borderRadius: 6, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', opacity: 0, transition: 'all 0.15s' }} className="group-hover:!opacity-100 hover:!text-[#f87171]"><Trash2 size={14} /></button>
                                                )}
                                                <ChevronRight size={15} color="var(--text-3)" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div style={{ padding: '0 24px 20px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
                                                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 16, marginBottom: 10 }}>Amostra</p>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                                                    {list.leads.slice(0, 9).map((lead, idx) => (
                                                        <div key={idx} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--mono)' }}>
                                                            <span style={{ color: 'var(--text-2)' }}>{lead.nome || '—'}</span>
                                                            <span style={{ color: 'var(--text-3)', margin: '0 6px' }}>·</span>
                                                            <span style={{ color: 'var(--text-3)' }}>{lead.email}</span>
                                                        </div>
                                                    ))}
                                                    {list.leads.length > 9 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, color: 'var(--text-3)', fontStyle: 'italic' }}>+{list.leads.length - 9} registros</div>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
