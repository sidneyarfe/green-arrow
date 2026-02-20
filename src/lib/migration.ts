import { storage } from './storage'
import { db } from './db'
import { toast } from 'sonner'

export async function migrateLocalToSupabase() {
    try {
        const instances = storage.getInstances()
        const templates = storage.getTemplates()
        const lists = storage.getLists()
        const campaigns = storage.getCampaigns()

        console.log('Iniciando migração...')

        // 1. Migrate Instances
        for (const inst of instances) {
            // Avoid migrating seed/demo data if needed, or just migrate everything
            await db.addInstance({
                name: inst.name,
                url: inst.url,
                secretKey: inst.secretKey,
                status: inst.status,
                lastTested: inst.lastTested
            })
        }

        // 2. Migrate Templates
        for (const temp of templates) {
            await db.addTemplate({
                name: temp.name,
                assunto: temp.assunto,
                corpo: temp.corpo
            })
        }

        // 3. Migrate Lists & Leads
        for (const list of lists) {
            await db.addList(list.name, list.leads)
        }

        // 4. Migrate Campaigns
        for (const camp of campaigns) {
            await db.addCampaign({
                name: camp.name,
                config: camp.config,
                status: camp.status,
                stats: camp.stats
            })
        }

        toast.success('Migração de dados concluída com sucesso!')
        return true
    } catch (error: any) {
        console.error('Erro na migração:', error)
        toast.error('Erro ao migrar dados: ' + error.message)
        return false
    }
}
