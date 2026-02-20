'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const navGroups = [
    {
        label: 'Principal',
        items: [
            {
                href: '/',
                label: 'Dashboard',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="2" width="5" height="5" rx="1" />
                        <rect x="9" y="2" width="5" height="5" rx="1" />
                        <rect x="2" y="9" width="5" height="5" rx="1" />
                        <rect x="9" y="9" width="5" height="5" rx="1" />
                    </svg>
                ),
            },
            {
                href: '/arsenal',
                label: 'Arsenal',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="3" width="12" height="3" rx="1" />
                        <rect x="2" y="10" width="12" height="3" rx="1" />
                    </svg>
                ),
            },
        ],
    },
    {
        label: 'Envios',
        items: [
            {
                href: '/templates',
                label: 'Templates',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 4h12M2 8h8M2 12h5" />
                    </svg>
                ),
            },
            {
                href: '/campanhas',
                label: 'Campanhas',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M8 2l1.5 4h4l-3.5 2.5 1.5 4L8 10l-3.5 2.5 1.5-4L2.5 6h4z" />
                    </svg>
                ),
            },
            {
                href: '/listas',
                label: 'Listas',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="8" cy="6" r="3" />
                        <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                    </svg>
                ),
            },
        ],
    },
    {
        label: 'Dados',
        items: [
            {
                href: '/metricas',
                label: 'Métricas',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 12l3-4 3 2 3-5 3 3" />
                    </svg>
                ),
            },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside style={{
            width: 'var(--sidebar-w)',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            background: 'var(--surface)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
        }}>
            {/* Logo */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 16px',
                height: 'var(--topbar-h)',
                borderBottom: '1px solid var(--border)',
            }}>
                <div style={{
                    width: 28,
                    height: 28,
                    background: 'var(--green)',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    flexShrink: 0,
                    boxShadow: '0 0 12px var(--green-glow)',
                }}>⚡</div>
                <span style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    letterSpacing: '-0.01em',
                }}>Green Arrow</span>
            </div>

            {/* Nav */}
            <nav style={{
                padding: '12px 8px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                overflowY: 'auto',
            }}>
                {navGroups.map((group, gi) => (
                    <div key={group.label}>
                        <div style={{
                            fontSize: 10.5,
                            fontWeight: 500,
                            letterSpacing: '0.08em',
                            color: 'var(--text-3)',
                            textTransform: 'uppercase',
                            padding: '8px 10px 4px',
                            marginTop: gi === 0 ? 0 : 8,
                        }}>{group.label}</div>

                        {group.items.map(({ href, label, icon }) => {
                            const isActive = pathname === href;
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 9,
                                        padding: '7px 10px',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        fontSize: 13.5,
                                        fontWeight: isActive ? 500 : 400,
                                        color: isActive ? 'var(--green)' : 'var(--text-2)',
                                        transition: 'all 0.15s',
                                        textDecoration: 'none',
                                        position: 'relative',
                                        background: isActive ? 'var(--green-dim)' : 'transparent',
                                    }}
                                    onMouseEnter={e => {
                                        if (!isActive) {
                                            (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
                                            (e.currentTarget as HTMLElement).style.color = 'var(--text-1)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!isActive) {
                                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                                            (e.currentTarget as HTMLElement).style.color = 'var(--text-2)';
                                        }
                                    }}
                                >
                                    {isActive && (
                                        <span style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            width: 2.5,
                                            height: 16,
                                            background: 'var(--green)',
                                            borderRadius: '0 2px 2px 0',
                                            boxShadow: '0 0 6px var(--green-glow)',
                                        }} />
                                    )}
                                    <span style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }}>{icon}</span>
                                    {label}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* User Footer */}
            <div style={{
                padding: '12px 8px',
                borderTop: '1px solid var(--border)',
            }}>
                <UserFooter />
            </div>
        </aside>
    );
}

function UserFooter() {
    const [user, setUser] = useState<User | null>(null);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            const { data } = await supabase.auth.getUser();
            setUser(data.user);
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    if (!user) return null;

    const initials = user.email?.charAt(0).toUpperCase() || 'U';

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '7px 10px',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'background 0.15s',
            position: 'relative',
        }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
            <div style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00d26a, #00894a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: '#000',
                flexShrink: 0,
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: 'var(--text-1)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>{user.email?.split('@')[0]}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{user.email}</div>
            </div>
            <button
                onClick={handleLogout}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-3)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                title="Sair"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
            </button>
        </div>
    );
}
