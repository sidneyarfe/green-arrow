import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '64px 24px', textAlign: 'center',
        }}>
            <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
            }}>
                <Icon size={24} color="var(--text-3)" strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>{title}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 340, lineHeight: 1.6, marginBottom: 24 }}>
                {description}
            </p>
            {actionLabel && onAction && (
                <button className="btn-primary" onClick={onAction}>{actionLabel}</button>
            )}
        </div>
    );
}
