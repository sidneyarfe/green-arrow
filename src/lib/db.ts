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
        return data as any[] as Instance[]
    },

    async addInstance(instance: Omit<Instance, 'id'>): Promise<Instance> {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase
            .from('instances')
            .insert([{ ...instance, user_id: user?.id }])
            .select()
            .single()

        if (error) throw error
        return data as any as Instance
    },

    async updateInstance(id: string, updates: Partial<Instance>): Promise<Instance> {
        const { data, error } = await supabase
            .from('instances')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data as any as Instance
    },

    async deleteInstance(id: string): Promise<void> {
        const { error } = await supabase
            .from('instances')
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
        return data as any[] as EmailTemplate[]
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
        return data as any as EmailTemplate
    },

    async updateTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
        const { data, error } = await supabase
            .from('templates')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data as any as EmailTemplate
    },

    async deleteTemplate(id: string): Promise<void> {
        const { error } = await supabase
            .from('templates')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    // --- LISTS & LEADS ---
    async getLists(): Promise<LeadList[]> {
        const { data: lists, error: listError } = await supabase
            .from('lists')
            .select('*, leads(*)')
            .order('created_at', { ascending: false })

        if (listError) throw listError
        return lists as any[] as LeadList[]
    },

    async addList(name: string, leads: Lead[]): Promise<LeadList> {
        const { data: { user } } = await supabase.auth.getUser()

        // 1. Create List
        const { data: list, error: listError } = await supabase
            .from('lists')
            .insert([{ name, user_id: user?.id }])
            .select()
            .single()

        if (listError) throw listError

        // 2. Create Leads
        if (leads.length > 0) {
            const leadsToInsert = leads.map(l => ({
                list_id: list.id,
                nome: l.nome,
                email: l.email,
                extra_data: l // Store full object in extra_data if needed
            }))

            const { error: leadsError } = await supabase
                .from('leads')
                .insert(leadsToInsert)

            if (leadsError) throw leadsError
        }

        return { ...list, leads } as any as LeadList
    },

    async deleteList(id: string): Promise<void> {
        const { error } = await supabase
            .from('lists')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    // --- CAMPAIGNS ---
    async getCampaigns(): Promise<Campaign[]> {
        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as any[] as Campaign[]
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
        return data as any as Campaign
    },

    async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
        const { data, error } = await supabase
            .from('campaigns')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data as any as Campaign
    },

    async deleteCampaign(id: string): Promise<void> {
        const { error } = await supabase
            .from('campaigns')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}
