'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Instance, Lead, CampaignConfig, EmailTemplate, LeadList, Campaign } from '@/lib/types';
import { storage } from '@/lib/storage';
import { parseFile, sanitizeLeads, ParsedFile } from '@/lib/csvParser';
import {
    Upload,
    FileSpreadsheet,
    Eye,
    EyeOff,
    ArrowLeft,
    Crosshair,
    Mail,
    Users,
    Clock,
    CheckSquare,
    AlertTriangle,
    X,
    Trash2,
    ChevronRight,
    Play,
    Check,
} from 'lucide-react';

type Step = 'data' | 'strategy' | 'review';

type LocalTemplate = {
    assunto: string;
    corpo: string;
};

export default function CampaignPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [currentStep, setCurrentStep] = useState<Step>('data');

    // Data step
    const [dragOver, setDragOver] = useState(false);
    const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
    const [fileName, setFileName] = useState('');
    const [nameCol, setNameCol] = useState('');
    const [emailCol, setEmailCol] = useState('');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [stats, setStats] = useState({ duplicates: 0, invalid: 0 });

    // Strategy step
    const [activeTab, setActiveTab] = useState(0);
    const [templates, setTemplates] = useState<LocalTemplate[]>([
        { assunto: '', corpo: '' },
        { assunto: '', corpo: '' },
        { assunto: '', corpo: '' },
    ]);
    const [responderPara, setResponderPara] = useState('');
    const [intervalMin, setIntervalMin] = useState(15);
    const [intervalMax, setIntervalMax] = useState(60);
    const [showPreview, setShowPreview] = useState(false);

    // Review step
    const [instances, setInstances] = useState<Instance[]>([]);
    const [selectedInstances, setSelectedInstances] = useState<string[]>([]);

    useEffect(() => {
        setInstances(storage.getInstances());
    }, []);

    const handleFile = useCallback(async (file: File) => {
        try {
            const parsed = await parseFile(file);
            setParsedFile(parsed);
            setFileName(file.name);

            const lowerHeaders = parsed.headers.map(h => h.toLowerCase());
            const nameIdx = lowerHeaders.findIndex(h => h.includes('nome') || h.includes('name') || h.includes('first'));
            const emailIdx = lowerHeaders.findIndex(h => h.includes('email') || h.includes('e-mail') || h.includes('mail'));

            if (nameIdx >= 0) setNameCol(parsed.headers[nameIdx]);
            if (emailIdx >= 0) setEmailCol(parsed.headers[emailIdx]);
        } catch (err) {
            alert((err as Error).message);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    useEffect(() => {
        if (parsedFile && nameCol && emailCol) {
            const result = sanitizeLeads(parsedFile.rows, nameCol, emailCol);
            setLeads(result.leads);
            setStats({ duplicates: result.duplicates, invalid: result.invalid });
        }
    }, [parsedFile, nameCol, emailCol]);

    const updateTemplate = useCallback((index: number, field: keyof LocalTemplate, value: string) => {
        setTemplates(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
    }, []);

    const toggleInstance = useCallback((id: string) => {
        setSelectedInstances(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const activeTemplates = useMemo(() => templates.filter(t => t.assunto.trim() && t.corpo.trim()), [templates]);
    const leadsPerInstance = useMemo(() => {
        if (selectedInstances.length === 0) return 0;
        return Math.ceil(leads.length / selectedInstances.length);
    }, [leads.length, selectedInstances.length]);
    const avgInterval = useMemo(() => (intervalMin + intervalMax) / 2, [intervalMin, intervalMax]);
    const estimatedTime = useMemo(() => {
        if (leadsPerInstance === 0) return '0 min';
        const totalSeconds = leadsPerInstance * avgInterval;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.ceil((totalSeconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}min`;
        return `${minutes} min`;
    }, [leadsPerInstance, avgInterval]);

    const handleStart = () => {
        // 1. Save list first
        const newList: LeadList = {
            id: crypto.randomUUID(),
            name: `Campanha - ${fileName || 'Sem nome'}`,
            leads: leads,
            createdAt: new Date().toISOString()
        };
        storage.saveList(newList);

        // 2. Prepare templates
        const campaignTemplates: EmailTemplate[] = activeTemplates.map((t, i) => ({
            id: crypto.randomUUID(),
            name: `Template ${i + 1}`,
            assunto: t.assunto,
            corpo: t.corpo,
            createdAt: new Date().toISOString()
        }));

        // 3. Create config
        const config: CampaignConfig = {
            intervalMin,
            intervalMax,
            responderPara,
            templates: campaignTemplates,
            selectedInstances,
            listId: newList.id
        };

        // 4. Create campaign
        const campaign: Campaign = {
            id: crypto.randomUUID(),
            name: `Campanha ${new Date().toLocaleString('pt-BR')}`,
            config,
            status: 'draft',
            createdAt: new Date().toISOString(),
            stats: {
                total: leads.length,
                sent: 0,
                failed: 0,
                pending: leads.length
            }
        };

        storage.saveCampaign(campaign);
        router.push(`/execucao?id=${campaign.id}`);
    };

    const canAdvanceData = leads.length > 0 && nameCol && emailCol;
    const canAdvanceStrategy = activeTemplates.length > 0 && responderPara.trim();
    const canStart = selectedInstances.length > 0;

    const stepLabels = [
        { key: 'data' as Step, label: 'Dados', num: 1 },
        { key: 'strategy' as Step, label: 'Estratégia', num: 2 },
        { key: 'review' as Step, label: 'Revisão', num: 3 },
    ];

    const currentStepIndex = stepLabels.findIndex(s => s.key === currentStep);

    return (
        <div className="max-w-4xl mx-auto space-y-8 fade-in pb-10">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-semibold text-text tracking-tight">Nova Campanha</h2>
                <p className="text-text-muted text-sm mt-1">Configure e lance sua campanha de cold mail</p>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-0 w-full max-w-md">
                {stepLabels.map((s, i) => {
                    const isActive = currentStep === s.key;
                    const isPast = currentStepIndex > i;

                    return (
                        <div key={s.key} className="flex items-center flex-1 last:flex-none">
                            <button
                                onClick={() => { if (isPast) setCurrentStep(s.key); }}
                                className="flex items-center gap-2.5 group"
                                disabled={!isPast && !isActive}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-150 shrink-0 ${isActive ? 'bg-primary text-bg' :
                                    isPast ? 'bg-primary/20 text-primary' :
                                        'bg-surface-alt text-text-muted'
                                    }`}>
                                    {isPast ? <Check className="w-3.5 h-3.5" /> : s.num}
                                </div>
                                <span className={`text-sm font-medium whitespace-nowrap ${isActive ? 'text-text' :
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

            {/* Step: Data */}
            {currentStep === 'data' && (
                <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 space-y-6 fade-in">
                    <div>
                        <h3 className="text-base font-semibold text-text">Importar Contatos</h3>
                        <p className="text-text-muted text-sm mt-0.5">Faça upload da sua lista de leads em CSV ou XLSX</p>
                    </div>

                    {!parsedFile ? (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors duration-150 ${dragOver
                                ? 'border-primary/50 bg-primary/5'
                                : 'border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl bg-surface-alt flex items-center justify-center mx-auto mb-4 ${dragOver ? 'bg-primary/10' : ''}`}>
                                <Upload className={`w-6 h-6 ${dragOver ? 'text-primary' : 'text-text-muted'}`} />
                            </div>
                            <p className="text-text text-sm font-medium mb-1">
                                Arraste seu arquivo aqui
                            </p>
                            <p className="text-text-muted text-xs">ou clique para selecionar · CSV, XLSX</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileInput}
                                className="hidden"
                            />
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* File info */}
                            <div className="flex items-center justify-between bg-bg rounded-xl border border-white/[0.06] p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <FileSpreadsheet className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-text text-sm font-medium">{fileName}</p>
                                        <p className="text-text-muted text-xs">{parsedFile.rows.length} linhas</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setParsedFile(null); setFileName(''); setLeads([]); setNameCol(''); setEmailCol(''); }}
                                    className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Column Mapping */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-text-muted font-medium mb-1.5">Coluna do Nome</label>
                                    <select
                                        value={nameCol}
                                        onChange={(e) => setNameCol(e.target.value)}
                                        className="w-full bg-bg rounded-lg px-3.5 py-2.5 text-sm text-text outline-none border border-white/[0.06] focus:border-primary/40 transition-colors cursor-pointer"
                                    >
                                        <option value="">Selecione...</option>
                                        {parsedFile.headers.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-text-muted font-medium mb-1.5">Coluna do E-mail</label>
                                    <select
                                        value={emailCol}
                                        onChange={(e) => setEmailCol(e.target.value)}
                                        className="w-full bg-bg rounded-lg px-3.5 py-2.5 text-sm text-text outline-none border border-white/[0.06] focus:border-primary/40 transition-colors cursor-pointer"
                                    >
                                        <option value="">Selecione...</option>
                                        {parsedFile.headers.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Stats */}
                            {leads.length > 0 && (
                                <div className="flex gap-4 text-xs items-center">
                                    <span className="text-primary font-medium flex items-center gap-1.5">
                                        <Check className="w-3.5 h-3.5" />
                                        {leads.length} leads válidos
                                    </span>
                                    {stats.duplicates > 0 && (
                                        <span className="text-warning font-medium flex items-center gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            {stats.duplicates} duplicados
                                        </span>
                                    )}
                                    {stats.invalid > 0 && (
                                        <span className="text-danger font-medium flex items-center gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            {stats.invalid} inválidos
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Preview Table */}
                            {leads.length > 0 && (
                                <div className="bg-bg rounded-xl overflow-hidden border border-white/[0.06]">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/[0.06] text-text-muted">
                                                <th className="text-left px-4 py-3 font-medium text-xs">#</th>
                                                <th className="text-left px-4 py-3 font-medium text-xs">Nome</th>
                                                <th className="text-left px-4 py-3 font-medium text-xs">E-mail</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leads.slice(0, 5).map((lead, i) => (
                                                <tr key={i} className="border-b border-white/[0.03]">
                                                    <td className="px-4 py-2.5 text-text-muted text-xs">{i + 1}</td>
                                                    <td className="px-4 py-2.5 text-text text-sm">{lead.nome}</td>
                                                    <td className="px-4 py-2.5 text-text-secondary text-sm font-mono">{lead.email}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {leads.length > 5 && (
                                        <div className="px-4 py-2.5 text-xs text-text-muted text-center border-t border-white/[0.03]">
                                            + {leads.length - 5} registros
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-white/[0.06]">
                        <button
                            onClick={() => setCurrentStep('strategy')}
                            disabled={!canAdvanceData}
                            className="btn-primary px-5 py-2.5 rounded-lg text-sm inline-flex items-center gap-2"
                        >
                            Continuar
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step: Strategy */}
            {currentStep === 'strategy' && (
                <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 space-y-6 fade-in">
                    <div>
                        <h3 className="text-base font-semibold text-text">Estratégia de E-mail</h3>
                        <p className="text-text-muted text-sm mt-0.5">Crie seus templates e configure o envio</p>
                    </div>

                    {/* Template Tabs */}
                    <div className="flex gap-1 p-1 bg-bg rounded-lg border border-white/[0.06] inline-flex">
                        {templates.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveTab(i)}
                                className={`px-4 py-2 rounded-md text-xs font-medium transition-colors duration-150 ${activeTab === i
                                    ? 'bg-surface-alt text-text'
                                    : 'text-text-muted hover:text-text-secondary'
                                    }`}
                            >
                                Template {i + 1}
                                {templates[i].assunto.trim() && templates[i].corpo.trim() && (
                                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Preview Toggle */}
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text bg-white/[0.04] hover:bg-white/[0.06] transition-colors flex items-center gap-1.5 font-medium"
                        >
                            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {showPreview ? 'Editar' : 'Visualizar'}
                        </button>
                    </div>

                    {/* Template Editor */}
                    {!showPreview ? (
                        <div className="space-y-4 fade-in">
                            <div>
                                <label className="block text-xs text-text-muted font-medium mb-1.5">Assunto</label>
                                <input
                                    type="text"
                                    placeholder="Ex: {{nome}}, proposta exclusiva"
                                    value={templates[activeTab].assunto}
                                    onChange={(e) => updateTemplate(activeTab, 'assunto', e.target.value)}
                                    className="w-full bg-bg rounded-lg px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted/50 outline-none border border-white/[0.06] focus:border-primary/40 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-text-muted font-medium mb-1.5">Mensagem</label>
                                <textarea
                                    rows={10}
                                    placeholder={`Olá {{nome}},\n\n...`}
                                    value={templates[activeTab].corpo}
                                    onChange={(e) => updateTemplate(activeTab, 'corpo', e.target.value)}
                                    className="w-full bg-bg rounded-lg px-3.5 py-3 text-sm text-text placeholder:text-text-muted/50 outline-none border border-white/[0.06] focus:border-primary/40 transition-colors resize-none leading-relaxed"
                                />
                            </div>
                            <p className="text-xs text-text-muted">
                                Use <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[11px]">{'{{nome}}'}</code> para personalizar com o nome do lead
                            </p>
                        </div>
                    ) : (
                        <div className="bg-bg rounded-xl p-6 border border-white/[0.06] fade-in">
                            <div className="space-y-4">
                                <div className="pb-4 border-b border-white/[0.06]">
                                    <p className="text-xs text-text-muted mb-1">Assunto</p>
                                    <p className="text-base text-text font-medium" dangerouslySetInnerHTML={{
                                        __html: templates[activeTab].assunto.replace(
                                            /\{\{nome\}\}/g,
                                            `<span class="text-primary">${leads[0]?.nome || 'Cliente'}</span>`
                                        )
                                    }} />
                                </div>
                                <div>
                                    <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed"
                                        dangerouslySetInnerHTML={{
                                            __html: templates[activeTab].corpo.replace(
                                                /\{\{nome\}\}/g,
                                                `<span class="text-primary">${leads[0]?.nome || 'Cliente'}</span>`
                                            )
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/[0.06]">
                        {/* Reply-to */}
                        <div>
                            <label className="block text-xs text-text-muted font-medium mb-1.5">Responder para</label>
                            <input
                                type="email"
                                placeholder="respostas@empresa.com"
                                value={responderPara}
                                onChange={(e) => setResponderPara(e.target.value)}
                                className="w-full bg-bg rounded-lg px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted/50 outline-none border border-white/[0.06] focus:border-primary/40 transition-colors"
                            />
                        </div>

                        {/* Cadence */}
                        <div>
                            <label className="block text-xs text-text-muted font-medium mb-1.5">Intervalo aleatório (segundos)</label>
                            <div className="bg-bg rounded-lg p-4 border border-white/[0.06] space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-text-secondary">Mínimo</span>
                                    <span className="text-sm font-medium text-text tabular-nums">{intervalMin}s</span>
                                </div>
                                <input
                                    type="range"
                                    min={5}
                                    max={120}
                                    value={intervalMin}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setIntervalMin(v);
                                        if (v > intervalMax) setIntervalMax(v);
                                    }}
                                    className="w-full"
                                />
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-text-secondary">Máximo</span>
                                    <span className="text-sm font-medium text-text tabular-nums">{intervalMax}s</span>
                                </div>
                                <input
                                    type="range"
                                    min={5}
                                    max={120}
                                    value={intervalMax}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setIntervalMax(v);
                                        if (v < intervalMin) setIntervalMin(v);
                                    }}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-white/[0.06]">
                        <button
                            onClick={() => setCurrentStep('data')}
                            className="btn-secondary px-4 py-2.5 rounded-lg text-sm inline-flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> Voltar
                        </button>
                        <button
                            onClick={() => setCurrentStep('review')}
                            disabled={!canAdvanceStrategy}
                            className="btn-primary px-5 py-2.5 rounded-lg text-sm inline-flex items-center gap-2"
                        >
                            Continuar
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step: Review */}
            {currentStep === 'review' && (
                <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 space-y-6 fade-in">
                    <div>
                        <h3 className="text-base font-semibold text-text">Revisar e Lançar</h3>
                        <p className="text-text-muted text-sm mt-0.5">Confira os detalhes antes de iniciar o envio</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-bg rounded-xl p-4 border border-white/[0.06]">
                            <p className="text-2xl font-semibold text-text tabular-nums">{leads.length}</p>
                            <p className="text-xs text-text-muted mt-1">Leads</p>
                        </div>
                        <div className="bg-bg rounded-xl p-4 border border-white/[0.06]">
                            <p className="text-2xl font-semibold text-text tabular-nums">{activeTemplates.length}</p>
                            <p className="text-xs text-text-muted mt-1">Templates</p>
                        </div>
                        <div className="bg-bg rounded-xl p-4 border border-white/[0.06]">
                            <p className="text-lg font-semibold text-text tabular-nums">{intervalMin}-{intervalMax}<span className="text-sm font-normal text-text-muted ml-0.5">s</span></p>
                            <p className="text-xs text-text-muted mt-1">Intervalo</p>
                        </div>
                    </div>

                    {/* Instance Selection */}
                    <div className="space-y-3">
                        <label className="block text-xs text-text-muted font-medium">Selecione as instâncias de envio</label>

                        {instances.length === 0 ? (
                            <div className="bg-danger/5 border border-danger/10 rounded-xl p-5 text-center">
                                <p className="text-danger text-sm font-medium">Nenhuma instância disponível.</p>
                                <button onClick={() => router.push('/guia')} className="text-text-secondary text-xs underline mt-2 hover:text-text">Configurar instância</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {instances.map(inst => (
                                    <label
                                        key={inst.id}
                                        className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-colors duration-150 border ${selectedInstances.includes(inst.id)
                                            ? 'bg-primary/5 border-primary/20'
                                            : 'bg-bg border-white/[0.06] hover:border-white/[0.1]'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selectedInstances.includes(inst.id) ? 'bg-primary border-primary' : 'border-white/[0.15]'
                                            }`}>
                                            {selectedInstances.includes(inst.id) && <Check className="w-3 h-3 text-bg" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={selectedInstances.includes(inst.id)}
                                            onChange={() => toggleInstance(inst.id)}
                                            className="hidden"
                                        />
                                        <div>
                                            <p className="text-text text-sm font-medium">{inst.name}</p>
                                            <p className="text-text-muted text-xs font-mono truncate max-w-[200px]">{inst.url}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Calculation Panel */}
                    {selectedInstances.length > 0 && (
                        <div className="bg-bg border border-white/[0.06] rounded-xl p-5 flex flex-col md:flex-row items-center gap-6">
                            <div className="flex-1 text-center md:text-left">
                                <p className="text-xs text-text-muted mb-1">Leads por instância</p>
                                <p className="text-lg font-semibold text-text tabular-nums">{leadsPerInstance}</p>
                            </div>
                            <div className="h-8 w-px bg-white/[0.06] hidden md:block"></div>
                            <div className="flex-1 text-center md:text-left">
                                <p className="text-xs text-text-muted mb-1">Tempo estimado</p>
                                <p className="text-lg font-semibold text-text">{estimatedTime}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between pt-4 border-t border-white/[0.06]">
                        <button
                            onClick={() => setCurrentStep('strategy')}
                            className="btn-secondary px-4 py-2.5 rounded-lg text-sm inline-flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> Voltar
                        </button>
                        <button
                            onClick={handleStart}
                            disabled={!canStart}
                            className="btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2"
                        >
                            <Play className="w-4 h-4" />
                            Iniciar Campanha
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
