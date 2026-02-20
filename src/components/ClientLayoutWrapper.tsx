'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isAuthPage = pathname === '/login' || pathname === '/signup'

    if (isAuthPage) {
        return <main className="min-h-screen">{children}</main>
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Topbar />
                <main style={{ flex: 1, padding: '32px 28px', overflowY: 'auto' }}>
                    {children}
                </main>
            </div>
        </div>
    )
}
