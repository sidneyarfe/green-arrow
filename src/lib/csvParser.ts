import * as XLSX from 'xlsx';
import { Lead } from './types';

export interface ParsedFile {
    headers: string[];
    rows: Record<string, string>[];
}

export function parseFile(file: File): Promise<ParsedFile> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

                if (jsonData.length === 0) {
                    reject(new Error('Arquivo vazio ou sem dados válidos.'));
                    return;
                }

                const headers = Object.keys(jsonData[0]);
                resolve({ headers, rows: jsonData });
            } catch {
                reject(new Error('Erro ao processar o arquivo. Verifique o formato.'));
            }
        };
        reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
        reader.readAsArrayBuffer(file);
    });
}

export function isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
}

export function sanitizeLeads(
    rows: Record<string, string>[],
    nameCol: string,
    emailCol: string
): { leads: Lead[]; duplicates: number; invalid: number } {
    const seen = new Set<string>();
    const leads: Lead[] = [];
    let duplicates = 0;
    let invalid = 0;

    for (const row of rows) {
        const email = (row[emailCol] || '').trim().toLowerCase();
        const nome = (row[nameCol] || '').trim();

        if (!isValidEmail(email)) {
            invalid++;
            continue;
        }

        if (seen.has(email)) {
            duplicates++;
            continue;
        }

        seen.add(email);
        leads.push({
            ...row, // Preserve all columns
            nome: nome || 'Cliente',
            email
        });
    }

    return { leads, duplicates, invalid };
}
