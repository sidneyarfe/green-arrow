type BadgeVariant = 'online' | 'error' | 'warning' | 'idle' | 'running' | 'paused' | 'done' | 'draft';

interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    ping?: boolean;
    className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
    online: 'badge-online',
    running: 'badge-online',
    error: 'badge-error',
    warning: 'badge-warning',
    idle: 'badge-idle',
    paused: 'badge-warning',
    done: 'badge-idle',
    draft: 'badge-idle',
};

export function Badge({ variant = 'idle', children, ping = false, className = '' }: BadgeProps) {
    return (
        <span className={`${variantMap[variant]} ${className}`}>
            {ping && (
                <span className="relative flex h-1.5 w-1.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${variant === 'running' || variant === 'online' ? 'bg-[#00E676]' : 'bg-current'}`} />
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${variant === 'running' || variant === 'online' ? 'bg-[#00E676]' : 'bg-current'}`} />
                </span>
            )}
            {children}
        </span>
    );
}
