import { createClient } from '@/lib/supabase/client'
import { Instance, LeadList, EmailTemplate, Campaign, Lead } from './types'

const supabase = createClient()

export const db = {
    // --- INSTANCES ---
    async getInstances(): Promise<Instance[]> {
        const { data, error } = await supabase
            .from('instances')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data || []).map((d: any) => ({
            ...d,
            createdAt: d.created_at
        })) as Instance[]
    },

    async addInstance(instance: Omit<Instance, 'id' | 'createdAt'>): Promise<Instance> {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase
            .from('instances')
            .insert([{
                name: instance.name,
                url: instance.url,
                secret_key: (instance as any).secretKey,
                status: instance.status,
                user_id: user?.id
            }])
            .select()
            .single()

        if (error) throw error
        return { ...data, secretKey: data.secret_key, createdAt: data.created_at } as Instance
    },

    async updateInstance(id: string, updates: Partial<Instance>): Promise<Instance> {
        const { data, error } = await supabase
            .from('instances')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return { ...data, secretKey: data.secret_key, createdAt: data.created_at } as Instance
    },

    async deleteInstance(id: string): Promise<void> {
        const { error } = await supabase
            .from('instances')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    // --- LISTS ---
    async getLists(): Promise<LeadList[]> {
        const { data, error } = await supabase
            .from('lists')
            .select('*, leads(*)')
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data || []).map((d: any) => ({
            ...d,
            createdAt: d.created_at,
            leads: (d.leads || []).map((l: any) => ({
                nome: l.nome,
                email: l.email,
                ...(l.extra_data || {})
            }))
        })) as LeadList[]
    },

    async addList(name: string, leads: Lead[]): Promise<LeadList> {
        const { data: { user } } = await supabase.auth.getUser()

        // 1. Create list
        const { data: listData, error: listError } = await supabase
            .from('lists')
            .insert([{ name, user_id: user?.id }])
            .select()
            .single()

        if (listError) throw listError

        // 2. Add leads
        if (leads.length > 0) {
            const leadsData = leads.map(l => {
                const { nome, email, ...extra_data } = l
                return {
                    list_id: listData.id,
                    nome,
                    email,
                    extra_data
                }
            })

            const { error: leadsError } = await supabase
                .from('leads')
                .insert(leadsData)

            if (leadsError) {
                console.error('Error inserting leads:', leadsError)
                throw new Error(`Lista criada, mas houve erro ao salvar os contatos: ${leadsError.message}`)
            }
        }

        return {
            id: listData.id,
            name: listData.name,
            createdAt: listData.created_at,
            leads
        } as LeadList
    },

    async deleteList(id: string): Promise<void> {
        const { error } = await supabase
            .from('lists')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    // --- TEMPLATES ---
    async getTemplates(): Promise<EmailTemplate[]> {
        const { data, error } = await supabase
            .from('templates')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data || []).map((d: any) => ({
            ...d,
            createdAt: d.created_at
        })) as EmailTemplate[]
    },

    async addTemplate(template: Omit<EmailTemplate, 'id' | 'createdAt'>): Promise<EmailTemplate> {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase
            .from('templates')
            .insert([{
                name: template.name,
                assunto: template.assunto,
                corpo: template.corpo,
                user_id: user?.id
            }])
            .select()
            .single()

        if (error) throw error
        return { ...data, createdAt: data.created_at } as EmailTemplate
    },

    async updateTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
        const { data, error } = await supabase
            .from('templates')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return { ...data, createdAt: data.created_at } as EmailTemplate
    },

    async deleteTemplate(id: string): Promise<void> {
        const { error } = await supabase
            .from('templates')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    async getLeadsByListId(listId: string): Promise<Lead[]> {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('list_id', listId)

        if (error) throw error
        return (data || []).map((d: { nome: string; email: string; extra_data?: Record<string, string> | null }) => ({
            nome: d.nome,
            email: d.email,
            ...((d.extra_data && typeof d.extra_data === 'object') ? d.extra_data as Record<string, string> : {})
        }))
    },

    // --- CAMPAIGNS ---
    async getCampaigns(): Promise<Campaign[]> {
        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data || []).map((d: any) => ({
            ...d,
            createdAt: d.created_at
        })) as Campaign[]
    },

    async addCampaign(campaign: Omit<Campaign, 'id' | 'createdAt'>): Promise<Campaign> {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase
            .from('campaigns')
            .insert([{
                name: campaign.name,
                config: campaign.config,
                status: campaign.status,
                stats: campaign.stats,
                user_id: user?.id
            }])
            .select()
            .single()

        if (error) throw error
        return { ...data, createdAt: data.created_at } as Campaign
    },

    async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
        const { data, error } = await supabase
            .from('campaigns')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return { ...data, createdAt: data.created_at } as Campaign
    },

    async deleteCampaign(id: string): Promise<void> {
        const { error } = await supabase
            .from('campaigns')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}
