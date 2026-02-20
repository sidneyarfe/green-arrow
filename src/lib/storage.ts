import { Instance, LeadList, EmailTemplate, Campaign } from './types';

const INSTANCES_KEY = 'greenarrow_instances';
const LISTS_KEY = 'greenarrow_lists';
const TEMPLATES_KEY = 'greenarrow_templates';
const CAMPAIGNS_KEY = 'greenarrow_campaigns'; // Changed to plural for list of campaigns

export const storage = {
    // --- INSTANCES ---
    getInstances(): Instance[] {
        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(INSTANCES_KEY);
        if (!data) {
            const seed = [{
                id: 'test-inst-1',
                name: 'Instância de Teste (Demo)',
                url: 'https://webhook.site/demo',
                secretKey: 'demo-secret-123',
                status: 'success' as const,
                lastTested: new Date().toISOString()
            }];
            this.saveInstances(seed);
            return seed;
        }
        return JSON.parse(data);
    },

    saveInstances(instances: Instance[]): void {
        localStorage.setItem(INSTANCES_KEY, JSON.stringify(instances));
    },

    addInstance(instance: Instance): Instance[] {
        const instances = this.getInstances();
        instances.push(instance);
        this.saveInstances(instances);
        return instances;
    },

    updateInstance(id: string, updates: Partial<Instance>): Instance[] {
        const instances = this.getInstances().map(inst =>
            inst.id === id ? { ...inst, ...updates } : inst
        );
        this.saveInstances(instances);
        return instances;
    },

    deleteInstance(id: string): Instance[] {
        const instances = this.getInstances().filter(inst => inst.id !== id);
        this.saveInstances(instances);
        return instances;
    },

    // --- LISTS ---
    getLists(): LeadList[] {
        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(LISTS_KEY);
        if (!data) {
            const seed = [{
                id: 'test-list-1',
                name: 'Lista de Exemplo (Teste)',
                leads: [
                    { nome: 'João Silva', email: 'joao@example.com' },
                    { nome: 'Maria Souza', email: 'maria@example.com' }
                ],
                createdAt: new Date().toISOString()
            }];
            localStorage.setItem(LISTS_KEY, JSON.stringify(seed));
            return seed;
        }
        return JSON.parse(data);
    },

    saveList(list: LeadList): LeadList[] {
        const lists = this.getLists();
        lists.push(list);
        localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
        return lists;
    },

    deleteList(id: string): LeadList[] {
        const lists = this.getLists().filter(l => l.id !== id);
        localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
        return lists;
    },

    // --- TEMPLATES ---
    getTemplates(): EmailTemplate[] {
        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(TEMPLATES_KEY);
        if (!data) {
            const seed = [{
                id: 'test-temp-1',
                name: 'Template de Boas-vindas',
                assunto: 'Olá {{nome}}, seja bem-vindo!',
                corpo: '<p>Olá <strong>{{nome}}</strong>,</p><p>Este é um email de teste disparado pelo Green Arrow.</p>',
                createdAt: new Date().toISOString()
            }];
            localStorage.setItem(TEMPLATES_KEY, JSON.stringify(seed));
            return seed;
        }
        return JSON.parse(data);
    },

    saveTemplate(template: EmailTemplate): EmailTemplate[] {
        const templates = this.getTemplates();
        templates.push(template);
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
        return templates;
    },

    updateTemplate(id: string, updates: Partial<EmailTemplate>): EmailTemplate[] {
        const templates = this.getTemplates().map(t =>
            t.id === id ? { ...t, ...updates } : t
        );
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
        return templates;
    },

    deleteTemplate(id: string): EmailTemplate[] {
        const templates = this.getTemplates().filter(t => t.id !== id);
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
        return templates;
    },

    // --- CAMPAIGNS ---
    getCampaigns(): Campaign[] {
        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(CAMPAIGNS_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveCampaign(campaign: Campaign): Campaign[] {
        const campaigns = this.getCampaigns();
        campaigns.push(campaign);
        localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
        return campaigns;
    },

    updateCampaign(id: string, updates: Partial<Campaign>): Campaign[] {
        const campaigns = this.getCampaigns().map(c =>
            c.id === id ? { ...c, ...updates } : c
        );
        localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
        return campaigns;
    },

    deleteCampaign(id: string): Campaign[] {
        const campaigns = this.getCampaigns().filter(c => c.id !== id);
        localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
        return campaigns;
    }
};
