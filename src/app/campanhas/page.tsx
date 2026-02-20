'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import { dispatchCampaign, stopAllDispatches } from '@/lib/engine';
import { Instance, Lead, EmailTemplate, LeadList, Campaign, LogEntry, InstanceQueue } from '@/lib/types';
import {
    Plus,
    Play,
    Square,
    Search,
    MoreHorizontal,
    Users,
    Mail,
    Clock,
    CheckCircle2,
    AlertCircle,
    Terminal,
    ChevronRight,
    ArrowLeft,
    Loader2,
    Activity,
    Shield,
    Trash2,
    Eye
} from 'lucide-react';
import { toast } from 'sonner';

// --- COMPONENTS ---

function ProgressRing({ progress, size = 64, strokeWidth = 4 }: { progress: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth}
            />
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke="var(--green)" strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
            />
        </svg>
    );
}

function StatusBadge({ status }: { status: Campaign['status'] }) {
    const config = {
        running: { label: 'Ativa', color: 'var(--green)', bg: 'rgba(0,210,106,0.1)' },
        paused: { label: 'Pausada', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
        completed: { label: 'Concluída', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
        draft: { label: 'Rascunho', color: 'var(--text-3)', bg: 'var(--surface-3)' },
        error: { label: 'Erro', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
    }[status] || { label: status, color: 'var(--text-3)', bg: 'var(--surface-3)' };

    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-white/5" style={{ backgroundColor: config.bg, color: config.color }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color, boxShadow: status === 'running' ? `0 0 6px ${config.color}` : 'none' }} />
            {config.label}
        </span>
    );
}

// --- MAIN PAGE ---

export default function CampanhasPage() {
    const [view, setView] = useState<'listing' | 'wizard' | 'monitor'>('listing');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);

    const loadCampaigns = async () => {
        try {
            const data = await db.getCampaigns();
            setCampaigns(data);
        } catch (err) {
            toast.error('Erro ao carregar campanhas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCampaigns();
    }, []);

    const handleNewCampaign = () => {
        setView('wizard');
    };

    const handleOpenMonitor = (campaign: Campaign) => {
        setActiveCampaign(campaign);
        setView('monitor');
    };

    return (
        <main className="max-w-7xl mx-auto p-8 fade-in">
            {view === 'listing' && (
                <ListingView
                    campaigns={campaigns}
                    loading={loading}
                    onNew={handleNewCampaign}
                    onOpen={handleOpenMonitor}
                />
            )}
            {view === 'wizard' && (
                <WizardView
                    onBack={() => setView('listing')}
                    onStart={(campaign) => {
                        setActiveCampaign(campaign);
                        setView('monitor');
                        loadCampaigns();
                    }}
                />
            )}
            {view === 'monitor' && activeCampaign && (
                <MonitorView
                    campaignId={activeCampaign.id}
                    onBack={() => {
                        setView('listing');
                        loadCampaigns();
                    }}
                />
            )}
        </main>
    );
}

// --- VIEW 1: LISTING ---

function ListingView({ campaigns, loading, onNew, onOpen }: {
    campaigns: Campaign[];
    loading: boolean;
    onNew: () => void;
    onOpen: (c: Campaign) => void;
}) {
    const [filter, setFilter] = useState<'all' | 'running' | 'paused' | 'completed' | 'draft'>('all');
    const [search, setSearch] = useState('');

    const filteredCampaigns = campaigns.filter(c => {
        const matchesFilter = filter === 'all' || c.status === filter;
        const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const stats = {
        total: campaigns.length,
        active: campaigns.filter(c => c.status === 'running').length,
        sent: campaigns.reduce((acc, c) => acc + (c.stats?.sent || 0), 0),
        avgDelivery: campaigns.length > 0
            ? (campaigns.reduce((acc, c) => acc + (c.stats?.total > 0 ? (c.stats.sent / c.stats.total) : 0), 0) / campaigns.length * 100).toFixed(1)
            : '0.0'
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir esta campanha?')) {
            try {
                await db.deleteCampaign(id);
                toast.success('Campanha excluída');
                window.location.reload();
            } catch (err) {
                toast.error('Erro ao excluir campanha');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[19px] font-semibold tracking-tight text-white mb-1">Campanhas</h1>
                    <p className="text-[13px] text-neutral-400">Gerencie e monitore seus disparos em tempo real.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn-ghost flex items-center gap-2" onClick={() => document.body.classList.toggle('show-empty')}>
                        <Activity className="w-3.5 h-3.5" />
                        Alternar preview
                    </button>
                    <button onClick={onNew} className="btn-primary">
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        Nova campanha
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: stats.total, sub: 'campanhas criadas' },
                    { label: 'Ativas agora', value: stats.active, sub: 'em disparo', color: 'var(--green)' },
                    { label: 'Emails enviados', value: stats.sent > 1000 ? (stats.sent / 1000).toFixed(1) + 'k' : stats.sent, sub: 'últimos 30 dias' },
                    { label: 'Taxa média entrega', value: <>{stats.avgDelivery}<span className="text-sm text-neutral-400">%</span></>, sub: 'acima da média' },
                ].map((s, i) => (
                    <div key={i} className="bg-[#141416] border border-white/5 rounded-[10px] p-4 fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
                        <div className="text-[11px] text-neutral-500 uppercase tracking-widest mb-2">{s.label}</div>
                        <div className="text-[22px] font-semibold text-white font-mono mb-1" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[11.5px] text-neutral-500">{s.sub}</div>
                    </div>
                ))}
            </div>

            <div className="bg-[#141416] border border-white/5 rounded-[10px] overflow-hidden fade-up" style={{ animationDelay: '0.16s' }}>
                <div className="flex items-center justify-between p-4 px-5 border-b border-white/5 gap-3">
                    <div className="flex gap-1">
                        {[
                            { id: 'all', label: 'Todas' },
                            { id: 'running', label: 'Ativas' },
                            { id: 'paused', label: 'Pausadas' },
                            { id: 'completed', label: 'Concluídas' },
                            { id: 'draft', label: 'Rascunhos' },
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setFilter(t.id as any)}
                                className={`px-3 py-1.5 rounded-md text-[12.5px] transition-all ${filter === t.id ? 'bg-[#1f1f23] text-white font-medium' : 'text-neutral-500 hover:text-neutral-300 hover:bg-[#1a1a1d]'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                            <input
                                type="text"
                                placeholder="Buscar campanha..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-[#1a1a1d] border border-white/10 rounded-md text-[13px] text-white pl-9 pr-3 py-1.5 w-[220px] outline-none focus:border-green-500/40 transition-all"
                            />
                        </div>
                        <button className="btn-ghost" style={{ padding: '6px 10px' }}>
                            <Activity className="w-3.5 h-3.5" />
                            Filtros
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-5 py-3 text-left text-[11px] font-medium text-neutral-500 uppercase tracking-widest">Campanha</th>
                                <th className="px-5 py-3 text-left text-[11px] font-medium text-neutral-500 uppercase tracking-widest">Status</th>
                                <th className="px-5 py-3 text-left text-[11px] font-medium text-neutral-500 uppercase tracking-widest">Progresso</th>
                                <th className="px-5 py-3 text-left text-[11px] font-medium text-neutral-500 uppercase tracking-widest">Enviados</th>
                                <th className="px-5 py-3 text-left text-[11px] font-medium text-neutral-500 uppercase tracking-widest">Abertura</th>
                                <th className="px-5 py-3 text-right text-[11px] font-medium text-neutral-500 uppercase tracking-widest">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-5 py-8 bg-white/[0.01]"></td>
                                    </tr>
                                ))
                            ) : filteredCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-20">
                                        <div className="flex flex-col items-center gap-3 text-center">
                                            <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                                                <Mail className="w-6 h-6 text-green-500" />
                                            </div>
                                            <h3 className="text-white font-semibold">Nenhuma campanha encontrada</h3>
                                            <p className="text-neutral-500 text-sm max-w-[320px]">Crie sua primeira campanha para começar a disparar emails em massa para suas listas.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCampaigns.map((c) => {
                                    const prog = c.stats?.total > 0 ? (c.stats.sent / c.stats.total) * 100 : 0;
                                    return (
                                        <tr
                                            key={c.id}
                                            className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                                            onClick={() => onOpen(c)}
                                        >
                                            <td className="px-5 py-4">
                                                <div className="font-medium text-white text-[13.5px]">{c.name}</div>
                                                <div className="text-[11.5px] text-neutral-500 mt-0.5">
                                                    Lista: {c.config?.listId || '—'} · {c.stats?.total || 0} contatos
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusBadge status={c.status} />
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3 max-w-[180px]">
                                                    <div className="flex-1 h-1.5 bg-[#1f1f23] rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${c.status === 'running' ? 'bg-[#00d26a]' : c.status === 'paused' ? 'bg-[#fbbf24]' : 'bg-[#60a5fa]'}`}
                                                            style={{ width: `${prog}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[12px] text-neutral-400 font-mono w-[36px] text-right">{Math.round(prog)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-[12.5px] text-neutral-300 font-mono">{c.stats?.sent || 0}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-[12.5px] text-green-500 font-mono">34.2%</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5 transition-all"
                                                        title="Visualizar"
                                                        onClick={(e) => { e.stopPropagation(); onOpen(c); }}
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5 transition-all" title="Configurar">
                                                        <Clock className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        className="w-8 h-8 rounded-md flex items-center justify-center text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                        title="Excluir"
                                                        onClick={(e) => handleDelete(e, c.id)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between p-4 px-5 border-t border-white/5">
                    <span className="text-[12px] text-neutral-500">Mostrando {filteredCampaigns.length} de {campaigns.length} campanhas</span>
                    <div className="flex gap-1">
                        <button className="w-8 h-8 rounded-md border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/5 transition-all">
                            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                        </button>
                        <button className="w-8 h-8 rounded-md bg-[#1f1f23] text-white text-[12px] font-medium border border-white/10">1</button>
                        <button className="w-8 h-8 rounded-md border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/5 transition-all">
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- VIEW 2: WIZARD ---

function WizardView({ onBack, onStart }: { onBack: () => void, onStart: (c: Campaign) => void }) {
    const [step, setStep] = useState(1);
    const [lists, setLists] = useState<LeadList[]>([]);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [instances, setInstances] = useState<Instance[]>([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        name: `Campanha #${Math.floor(Math.random() * 10000)}`,
        listId: '',
        templateId: '',
        replyTo: '',
        instanceIds: [] as string[],
        minDelay: 15,
        maxDelay: 45
    });

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const [l, t, i] = await Promise.all([
                    db.getLists(),
                    db.getTemplates(),
                    db.getInstances()
                ]);
                setLists(l);
                setTemplates(t);
                setInstances(i);
            } catch (err) {
                toast.error('Erro ao carregar ativos para o wizard');
            } finally {
                setLoading(false);
            }
        };
        fetchAssets();
    }, []);

    const selectedList = useMemo(() => lists.find(l => l.id === form.listId), [lists, form.listId]);
    const selectedTemplate = useMemo(() => templates.find(t => t.id === form.templateId), [templates, form.templateId]);

    const stats = useMemo(() => {
        const leadCount = selectedList?.leads?.length || 0;
        const instanceCount = form.instanceIds.length;
        const perInstance = instanceCount > 0 ? Math.ceil(leadCount / instanceCount) : 0;
        return { leadCount, instanceCount, perInstance };
    }, [selectedList, form.instanceIds]);

    const handleCreate = async () => {
        if (!selectedTemplate) return;

        try {
            const campaign = await db.addCampaign({
                name: form.name,
                status: 'draft',
                config: {
                    listId: form.listId,
                    templates: [selectedTemplate], // Current engine supports array, UI uses one for now
                    responderPara: form.replyTo,
                    selectedInstances: form.instanceIds,
                    intervalMin: form.minDelay,
                    intervalMax: form.maxDelay
                },
                stats: {
                    total: stats.leadCount,
                    sent: 0,
                    failed: 0,
                    pending: stats.leadCount
                }
            } as any);

            toast.success('Campanha criada com sucesso!');
            onStart(campaign);
        } catch (err) {
            toast.error('Erro ao criar campanha');
        }
    };

    if (loading) return <div className="py-20 text-center text-neutral-500 animate-pulse">Carregando ferramentas de campanha...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                    <h2 className="text-xl font-semibold text-white">Configurar Nova Campanha</h2>
                    <p className="text-sm text-neutral-400 mt-1">Conecte seus ativos para orquestrar o envio.</p>
                </div>
            </div>

            {/* Stepper Header */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { n: 1, l: 'Alvos' },
                    { n: 2, l: 'Munição' },
                    { n: 3, l: 'Tática' },
                    { n: 4, l: 'Revisão' }
                ].map((s) => (
                    <div key={s.n} className="space-y-2">
                        <div className={`h-1 rounded-full transition-colors ${step >= s.n ? 'bg-[#00E676]' : 'bg-neutral-800'}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${step === s.n ? 'text-[#00E676]' : 'text-neutral-500'}`}>
                            {s.n}. {s.l}
                        </span>
                    </div>
                ))}
            </div>

            <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-8 shadow-2xl">
                {step === 1 && (
                    <div className="space-y-6 fade-in">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-widest">Escolher Lista de Alvos</label>
                            <select
                                className="input h-12 bg-black border-neutral-800"
                                value={form.listId}
                                onChange={(e) => setForm({ ...form, listId: e.target.value })}
                            >
                                <option value="">Selecione uma lista...</option>
                                {lists.map(l => (
                                    <option key={l.id} value={l.id}>{l.name} ({l.leads?.length || 0} leads)</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end">
                            <button
                                disabled={!form.listId}
                                onClick={() => setStep(2)}
                                className="btn-primary"
                                style={{ backgroundColor: '#00E676', color: '#000' }}
                            >
                                Próximo Passo
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 fade-in">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-widest">Selecionar Template</label>
                            <select
                                className="input h-12 bg-black border-neutral-800"
                                value={form.templateId}
                                onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                            >
                                <option value="">Escolha um template...</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-widest">E-mail de Resposta (Reply To)</label>
                            <input
                                type="email"
                                placeholder="ex: suporte@suaempresa.com"
                                className="input h-12 bg-black border-neutral-800"
                                value={form.replyTo}
                                onChange={(e) => setForm({ ...form, replyTo: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-between">
                            <button onClick={() => setStep(1)} className="btn-ghost">Voltar</button>
                            <button
                                disabled={!form.templateId || !form.replyTo}
                                onClick={() => setStep(3)}
                                className="btn-primary"
                                style={{ backgroundColor: '#00E676', color: '#000' }}
                            >
                                Próximo Passo
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 fade-in">
                        <div className="space-y-4">
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-widest">Arsenal (Instâncias)</label>
                            <div className="grid grid-cols-1 gap-2">
                                {instances.map(inst => (
                                    <label key={inst.id} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${form.instanceIds.includes(inst.id) ? 'border-[#00E676] bg-[#00E676]/5' : 'border-neutral-800 bg-black hover:border-neutral-700'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${form.instanceIds.includes(inst.id) ? 'bg-[#00E676] border-[#00E676]' : 'border-neutral-700'}`}>
                                                {form.instanceIds.includes(inst.id) && <div className="w-2 h-2 rounded-sm bg-black" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{inst.name}</p>
                                                <p className="text-[10px] text-neutral-500 font-mono truncate max-w-[200px]">{inst.url}</p>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={form.instanceIds.includes(inst.id)}
                                            onChange={() => {
                                                const ids = form.instanceIds.includes(inst.id)
                                                    ? form.instanceIds.filter(id => id !== inst.id)
                                                    : [...form.instanceIds, inst.id];
                                                setForm({ ...form, instanceIds: ids });
                                            }}
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-neutral-800">
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-widest">Cadência (Intervalo Aleatório)</label>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between"><span className="text-[11px] text-neutral-500">Mín (s)</span><span className="text-[11px] text-white font-mono">{form.minDelay}s</span></div>
                                    <input type="range" min="5" max="300" value={form.minDelay} onChange={(e) => setForm({ ...form, minDelay: Number(e.target.value) })} className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#00E676]" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between"><span className="text-[11px] text-neutral-500">Máx (s)</span><span className="text-[11px] text-white font-mono">{form.maxDelay}s</span></div>
                                    <input type="range" min="5" max="300" value={form.maxDelay} onChange={(e) => setForm({ ...form, maxDelay: Number(e.target.value) })} className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#00E676]" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button onClick={() => setStep(2)} className="btn-ghost">Voltar</button>
                            <button
                                disabled={form.instanceIds.length === 0}
                                onClick={() => setStep(4)}
                                className="btn-primary"
                                style={{ backgroundColor: '#00E676', color: '#000' }}
                            >
                                Revisar
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-8 fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-black border border-neutral-800 space-y-1">
                                <span className="text-[10px] uppercase text-neutral-500 tracking-wider">Leads Totais</span>
                                <p className="text-2xl font-semibold text-white">{stats.leadCount}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-black border border-neutral-800 space-y-1">
                                <span className="text-[10px] uppercase text-neutral-500 tracking-wider">Instâncias</span>
                                <p className="text-2xl font-semibold text-white">{stats.instanceCount}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-6 rounded-2xl bg-[#00E676]/5 border border-[#00E676]/20">
                            <Shield className="w-10 h-10 text-[#00E676] opacity-50" />
                            <div>
                                <h4 className="text-sm font-semibold text-white">Pronto para o disparo</h4>
                                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                                    Temos <strong>{stats.leadCount} leads</strong>. Usando <strong>{stats.instanceCount} instâncias</strong>.
                                    Cada conta enviará aproximadamente <strong>{stats.perInstance} e-mails</strong>.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <button onClick={() => setStep(3)} className="btn-ghost">Voltar</button>
                            <button
                                onClick={handleCreate}
                                className="btn-primary animate-pulse"
                                style={{ backgroundColor: '#00E676', color: '#000', padding: '12px 24px' }}
                            >
                                <Play className="w-4 h-4 fill-current" />
                                INICIAR DISPARO
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- VIEW 3: MONITOR ---

function MonitorView({ campaignId, onBack }: { campaignId: string, onBack: () => void }) {
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [instances, setInstances] = useState<Instance[]>([]);
    const [queues, setQueues] = useState<InstanceQueue[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const init = async () => {
            const camps = await db.getCampaigns();
            const c = camps.find(x => x.id === campaignId);
            if (c) {
                setCampaign(c);
                const l = await db.getLeadsByListId(c.config.listId);
                setLeads(l);
                const i = await db.getInstances();
                setInstances(i.filter(x => c.config.selectedInstances.includes(x.id)));

                if (c.status === 'running') {
                    // Reconnect logic or just start if fresh
                }
            }
        };
        init();
    }, [campaignId]);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs]);

    const handleStart = async () => {
        if (!campaign || leads.length === 0 || instances.length === 0) return;

        setIsRunning(true);
        setIsCompleted(false);
        setLogs([]);

        await db.updateCampaign(campaignId, { status: 'running' });

        await dispatchCampaign(
            instances,
            leads,
            {
                intervalMin: campaign.config.intervalMin,
                intervalMax: campaign.config.intervalMax,
                responderPara: campaign.config.responderPara,
                templates: campaign.config.templates,
            },
            {
                onQueueUpdate: (q) => setQueues([...q]),
                onLog: (entry) => setLogs(prev => [...prev.slice(-100), entry]),
                onComplete: async () => {
                    setIsRunning(false);
                    setIsCompleted(true);
                    await db.updateCampaign(campaignId, {
                        status: 'completed',
                        stats: {
                            total: leads.length,
                            sent: leads.length, // Rough estimate for now, engine should return final counts
                            failed: 0,
                            pending: 0
                        }
                    });
                    toast.success('Disparo concluído!');
                },
            }
        );
    };

    const handleStop = () => {
        stopAllDispatches();
        setIsRunning(false);
        db.updateCampaign(campaignId, { status: 'paused' });
        toast.info('Disparo pausado.');
    };

    if (!campaign) return null;

    const totalSent = queues.reduce((sum, q) => sum + q.sent, 0);
    const progress = leads.length > 0 ? (totalSent / leads.length) * 100 : 0;

    return (
        <div className="space-y-8 fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h2 className="text-xl font-semibold text-white">Telemetria: {campaign.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-[#00E676] animate-pulse' : 'bg-neutral-600'}`} />
                            <span className="text-xs text-neutral-500">{isRunning ? 'Monitorando canais de disparo...' : 'Pronto para iniciar'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    {!isRunning && !isCompleted && (
                        <button onClick={handleStart} className="btn-primary" style={{ backgroundColor: '#00E676', color: '#000' }}>
                            <Play className="w-4 h-4 fill-current" />
                            Iniciar Agora
                        </button>
                    )}
                    {isRunning && (
                        <button onClick={handleStop} className="btn-secondary text-red-400 border-red-900/40 bg-red-400/5">
                            <Square className="w-4 h-4 fill-current" />
                            Pausar Orquestra
                        </button>
                    )}
                    {isCompleted && (
                        <div className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 text-sm font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Disparo Finalizado
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1 bg-[#111111] border border-neutral-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-4">
                    <ProgressRing progress={progress} size={100} strokeWidth={6} />
                    <div className="text-center">
                        <p className="text-2xl font-bold text-white tabular-nums">{Math.round(progress)}%</p>
                        <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Progresso Global</p>
                    </div>
                </div>

                <div className="col-span-3 grid grid-cols-3 gap-4">
                    <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 space-y-2">
                        <Users className="w-5 h-5 text-neutral-600" />
                        <p className="text-3xl font-bold text-white tabular-nums">{totalSent}</p>
                        <p className="text-xs text-neutral-400">Leads Impactados / {leads.length}</p>
                    </div>
                    <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 space-y-2">
                        <Activity className="w-5 h-5 text-neutral-600" />
                        <p className="text-3xl font-bold text-white tabular-nums">{queues.filter(q => q.status === 'sending').length}</p>
                        <p className="text-xs text-neutral-400">Contas Ativas no Momento</p>
                    </div>
                    <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 space-y-2">
                        <Clock className="w-5 h-5 text-neutral-600" />
                        <p className="text-3xl font-bold text-white tabular-nums">{campaign.config.intervalMin}-{campaign.config.intervalMax}<span className="text-sm font-normal text-neutral-500 ml-1">s</span></p>
                        <p className="text-xs text-neutral-400">Intervalo de Cadência</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
                {/* Parallel Queues Feed */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Filas Individuais</h3>
                    <div className="space-y-3">
                        {queues.length === 0 ? (
                            instances.map(inst => (
                                <div key={inst.id} className="bg-[#111111] border border-neutral-800 rounded-xl p-4 opacity-50">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm font-medium text-neutral-400">{inst.name}</span>
                                        <span className="text-[10px] text-neutral-600 uppercase">Idle</span>
                                    </div>
                                    <div className="h-1 bg-neutral-900 rounded-full overflow-hidden" />
                                </div>
                            ))
                        ) : (
                            queues.map(q => {
                                const qProg = (q.sent / q.total) * 100;
                                return (
                                    <div key={q.instanceId} className="bg-[#111111] border border-neutral-800 rounded-xl p-4">
                                        <div className="flex justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                {q.status === 'sending' && <Loader2 className="w-3 h-3 text-[#00E676] animate-spin" />}
                                                <span className="text-sm font-medium text-white">{q.instanceName}</span>
                                            </div>
                                            <span className="text-[10px] tabular-nums text-neutral-400">{q.sent} / {q.total}</span>
                                        </div>
                                        <div className="h-1 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                                            <div
                                                className={`h-full transition-all duration-1000 ${q.status === 'error' ? 'bg-red-500' : 'bg-[#00E676]'}`}
                                                style={{ width: `${qProg}%` }}
                                            />
                                        </div>
                                        {q.currentLead && (
                                            <p className="text-[10px] text-neutral-600 font-mono mt-2 truncate">→ {q.currentLead}</p>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Live Logs */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                        <Terminal className="w-3 h-3" />
                        Live Feed
                    </h3>
                    <div
                        ref={logRef}
                        className="flex-1 min-h-[400px] bg-black border border-neutral-800 rounded-2xl p-4 font-mono text-[11px] overflow-y-auto space-y-1.5 scroll-smooth shadow-inner"
                    >
                        {logs.length === 0 && (
                            <div className="h-full flex items-center justify-center text-neutral-700 animate-pulse">
                                AGUARDANDO COMANDO DE DISPARO...
                            </div>
                        )}
                        {logs.map((l, i) => (
                            <div key={i} className="flex gap-3">
                                <span className="text-neutral-600 shrink-0">[{l.timestamp}]</span>
                                <span className={`shrink-0 font-bold ${l.type === 'success' ? 'text-[#00E676]' : l.type === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
                                    {l.instanceName}:
                                </span>
                                <span className={l.type === 'error' ? 'text-red-400' : 'text-neutral-400'}>
                                    {l.message}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

