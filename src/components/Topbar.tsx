'use client';

import { usePathname } from 'next/navigation';
import { useTopbarActions } from '@/lib/topbarContext';

const routeLabels: Record<string, string> = {
    '/': 'Dashboard',
    '/arsenal': 'Arsenal',
    '/templates': 'Templates',
    '/campanhas': 'Campanhas',
    '/listas': 'Listas',
    '/metricas': 'Métricas',
};

export default function Topbar() {
    const pathname = usePathname();
    const { actions } = useTopbarActions();
    const label = routeLabels[pathname] ?? pathname.slice(1);

    return (
        <div style={{
            height: 'var(--topbar-h)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            background: 'var(--bg)',
            zIndex: 5,
            flexShrink: 0,
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--text-3)',
            }}>
                <span style={{ color: 'var(--text-2)' }}>Green Arrow</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l4 4-4 4" stroke="#52525c" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{label}</span>
            </div>
            {actions && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {actions}
                </div>
            )}
        </div>
    );
}
