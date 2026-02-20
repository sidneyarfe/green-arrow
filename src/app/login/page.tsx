'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

// ── SVG Icons ─────────────────────────────────────────────
const IconEmail = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="1" y="3" width="12" height="9" rx="1.5" />
        <path d="M1 5.5l6 4 6-4" />
    </svg>
)

const IconLock = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="2" y="6" width="10" height="7" rx="1.5" />
        <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" />
    </svg>
)

const IconUser = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="7" cy="5" r="2.5" />
        <path d="M2 13c0-2.8 2.2-5 5-5s5 2.2 5 5" />
    </svg>
)

const IconEye = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
        <ellipse cx="7" cy="7" rx="5.5" ry="3.5" />
        <circle cx="7" cy="7" r="1.5" />
    </svg>
)

const IconEyeOff = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
        <ellipse cx="7" cy="7" rx="5.5" ry="3.5" />
        <line x1="2" y1="2" x2="12" y2="12" />
    </svg>
)

const IconArrow = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7h8M8 4l3 3-3 3" />
    </svg>
)

const IconGoogle = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M15.5 8.18c0-.57-.05-1.12-.14-1.64H8v3.1h4.2a3.6 3.6 0 01-1.56 2.36v1.96h2.52C14.7 12.6 15.5 10.6 15.5 8.18z" fill="#4285F4" />
        <path d="M8 16c2.1 0 3.87-.7 5.16-1.88l-2.52-1.96c-.7.47-1.6.74-2.64.74-2.03 0-3.75-1.37-4.37-3.2H1.04v2.02A8 8 0 008 16z" fill="#34A853" />
        <path d="M3.63 9.7A4.8 4.8 0 013.38 8c0-.59.1-1.17.25-1.7V4.28H1.04A8 8 0 000 8c0 1.29.31 2.51.86 3.58l2.77-1.88z" fill="#FBBC05" />
        <path d="M8 3.18c1.14 0 2.17.4 2.97 1.17l2.23-2.23C11.87.79 10.1 0 8 0A8 8 0 001.04 4.28l2.59 2.02C4.25 4.55 5.97 3.18 8 3.18z" fill="#EA4335" />
    </svg>
)

// ── Password Strength ──────────────────────────────────────
function getStrength(val: string) {
    if (!val) return 0
    let score = 0
    if (val.length >= 8) score++
    if (/[A-Z]/.test(val)) score++
    if (/[0-9]/.test(val)) score++
    if (/[^A-Za-z0-9]/.test(val)) score++
    return score
}

const strengthColors = ['#f87171', '#fbbf24', '#34d399', '#00d26a']
const strengthLabels = ['Muito fraca', 'Fraca', 'Boa', 'Forte']

function StrengthBar({ password }: { password: string }) {
    const score = getStrength(password)
    if (!password) return null
    return (
        <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{
                        height: 2, flex: 1, borderRadius: 2,
                        background: i < score ? strengthColors[score - 1] : 'var(--surface-3)',
                        transition: 'background 0.3s'
                    }} />
                ))}
            </div>
            {score > 0 && (
                <div style={{ fontSize: 11, marginTop: 4, color: strengthColors[score - 1] }}>
                    {strengthLabels[score - 1]}
                </div>
            )}
        </div>
    )
}

// ── Auth Logic Component ───────────────────────────────────
function AuthContent() {
    const searchParams = useSearchParams()
    const [tab, setTab] = useState<'login' | 'cadastro'>('login')

    useEffect(() => {
        const t = searchParams.get('tab')
        if (t === 'cadastro') setTab('cadastro')
        else if (t === 'login') setTab('login')
    }, [searchParams])

    // Login state
    const [loginEmail, setLoginEmail] = useState('')
    const [loginPassword, setLoginPassword] = useState('')
    const [showLoginPass, setShowLoginPass] = useState(false)
    const [loginLoading, setLoginLoading] = useState(false)
    const [needsConfirmation, setNeedsConfirmation] = useState(false)
    const [resending, setResending] = useState(false)

    // Signup state
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [signupEmail, setSignupEmail] = useState('')
    const [signupPassword, setSignupPassword] = useState('')
    const [showSignupPass, setShowSignupPass] = useState(false)
    const [signupLoading, setSignupLoading] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!loginEmail || !loginPassword) return
        setLoginLoading(true)
        setNeedsConfirmation(false)

        // Debug: check if env vars are loaded
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
            toast.error('Configuração incompleta: variáveis de ambiente do Supabase não encontradas.')
            setLoginLoading(false)
            return
        }

        console.log('Tentando login para:', loginEmail)
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: loginPassword
            })
            if (error) {
                console.error('Login error:', error)
                if (error.message === 'Email not confirmed') {
                    setNeedsConfirmation(true)
                    toast.error('Email não confirmado.', {
                        description: 'Verifique sua caixa de entrada para confirmar seu acesso.',
                        duration: 6000,
                    })
                } else if (error.message === 'Invalid login credentials') {
                    toast.error('Email ou senha inválidos.')
                } else {
                    toast.error('Erro ao fazer login: ' + error.message)
                }
                setLoginLoading(false)
            } else {
                toast.success('Bem-vindo de volta!')
                router.refresh()
                router.push('/')
            }
        } catch (err: unknown) {
            console.error('Fatal login error:', err)
            const message = err instanceof Error ? err.message : 'Erro desconhecido'
            if (message.includes('Failed to fetch')) {
                toast.error('Erro de conexão com o servidor. Verifique se as variáveis de ambiente do Supabase estão corretas.')
            } else {
                toast.error('Erro inesperado ao fazer login: ' + message)
            }
            setLoginLoading(false)
        }
    }

    const handleResendConfirmation = async () => {
        if (!loginEmail) return
        setResending(true)
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: loginEmail,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                }
            })
            if (error) {
                toast.error('Erro ao reenviar: ' + error.message)
            } else {
                toast.success('Email de confirmação reenviado!')
            }
        } catch (err) {
            toast.error('Erro inesperado.')
        } finally {
            setResending(false)
        }
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!signupEmail || !signupPassword) return
        setSignupLoading(true)

        // Debug: check if env vars are loaded
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
            toast.error('Configuração incompleta: variáveis de ambiente do Supabase não encontradas.')
            setSignupLoading(false)
            return
        }

        try {
            const { error } = await supabase.auth.signUp({
                email: signupEmail,
                password: signupPassword,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                    data: { full_name: `${firstName} ${lastName}`.trim() }
                },
            })
            if (error) {
                toast.error('Erro ao criar conta: ' + error.message)
                setSignupLoading(false)
            } else {
                toast.success('Conta criada! Verifique seu email.')
                setTab('login')
                setSignupLoading(false)
            }
        } catch (err: unknown) {
            console.error('Fatal signup error:', err)
            const message = err instanceof Error ? err.message : 'Erro desconhecido'
            if (message.includes('Failed to fetch')) {
                toast.error('Erro de conexão com o servidor. Verifique se as variáveis de ambiente do Supabase estão corretas na Vercel.')
            } else {
                toast.error('Erro inesperado ao criar conta: ' + message)
            }
            setSignupLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })
            if (error) throw error
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido'
            toast.error('Erro ao conectar com Google: ' + message)
        }
    }

    const inputStyle: React.CSSProperties = {
        width: '100%',
        background: 'var(--surface-2)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 8,
        color: 'var(--text-1)',
        fontSize: 13.5,
        outline: 'none',
        fontFamily: 'var(--font)',
        padding: '9px 12px 9px 36px',
        WebkitAppearance: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
    }

    return (
        <div style={{
            font: "var(--font)",
            background: 'var(--bg)',
            color: 'var(--text-1)',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            WebkitFontSmoothing: 'antialiased',
        }}>
            {/* Grid BG */}
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)',
                backgroundSize: '40px 40px',
            }} />
            {/* Green glow orb */}
            <div style={{
                position: 'fixed', top: -200, left: '50%', transform: 'translateX(-50%)',
                width: 600, height: 400, pointerEvents: 'none', zIndex: 0,
                background: 'radial-gradient(ellipse,rgba(0,210,106,0.07) 0%,transparent 70%)',
            }} />

            {/* Topbar */}
            <header style={{
                position: 'fixed', top: 0, left: 0, right: 0, height: 52,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 28px',
                borderBottom: '1px solid var(--border)',
                background: 'rgba(13,13,15,0.8)',
                backdropFilter: 'blur(12px)',
                zIndex: 10,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 28, height: 28, background: 'var(--green)',
                        borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, boxShadow: '0 0 12px rgba(0,210,106,0.22)',
                    }}>⚡</div>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>Green Arrow</span>
                </div>
                <a href="#" style={{
                    fontSize: 13, color: 'var(--text-2)', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 5,
                }}>
                    Precisa de ajuda?
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <path d="M2 11L11 2M11 2H6M11 2v5" />
                    </svg>
                </a>
            </header>

            {/* Card Wrapper */}
            <div style={{
                position: 'relative', zIndex: 1,
                width: '100%', maxWidth: 400,
                padding: 16,
                animation: 'fadeUp 0.4s ease both',
            }}>
                <style>{`
                    @keyframes fadeUp {
                        from { opacity: 0; transform: translateY(16px); }
                        to   { opacity: 1; transform: translateY(0); }
                    }
                    input::placeholder { color: #52525c; }
                    input:focus { border-color: rgba(0,210,106,0.5) !important; box-shadow: 0 0 0 3px rgba(0,210,106,0.08) !important; }
                `}</style>

                <div style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                }}>
                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        background: 'var(--surface-2)',
                        borderBottom: '1px solid var(--border)',
                    }}>
                        {(['login', 'cadastro'] as const).map((t, i) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                style={{
                                    flex: 1, padding: '13px',
                                    textAlign: 'center',
                                    fontSize: 13.5, fontWeight: 500,
                                    color: tab === t ? 'var(--text-1)' : 'var(--text-3)',
                                    cursor: 'pointer',
                                    border: 'none',
                                    background: tab === t ? 'var(--surface)' : 'transparent',
                                    fontFamily: 'var(--font)',
                                    position: 'relative',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {t === 'login' ? 'Entrar' : 'Criar conta'}
                                {tab === t && (
                                    <div style={{
                                        position: 'absolute', bottom: -1, left: 0, right: 0,
                                        height: 2, background: 'var(--green)',
                                        boxShadow: '0 0 6px rgba(0,210,106,0.22)',
                                    }} />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* ── LOGIN PANEL ── */}
                    {tab === 'login' && (
                        <>
                            <div style={{
                                padding: '28px 28px 24px',
                                borderBottom: '1px solid var(--border)',
                                textAlign: 'center',
                            }}>
                                <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-1)', marginBottom: 5 }}>
                                    Bem-vindo de volta
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Entre na sua conta para continuar</div>
                            </div>

                            <div style={{ padding: '24px 28px' }}>
                                {/* Google */}
                                <button
                                    onClick={handleGoogleLogin}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                                        padding: '9px 14px', borderRadius: 8,
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        background: 'var(--surface-2)', color: 'var(--text-2)',
                                        fontSize: 13.5, fontFamily: 'var(--font)', fontWeight: 400,
                                        cursor: 'pointer', marginBottom: 16, transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
                                >
                                    <IconGoogle /> Continuar com Google
                                </button>

                                {/* Divider */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                    <span style={{ fontSize: 11.5, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>ou entre com email</span>
                                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                </div>

                                <form onSubmit={handleLogin}>
                                    {/* Email */}
                                    <div style={{ marginBottom: 14 }}>
                                        <div style={{ marginBottom: 6 }}>
                                            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-2)' }}>Email</span>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                                                <IconEmail />
                                            </span>
                                            <input
                                                type="email" required placeholder="voce@empresa.com"
                                                value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                                                style={{ ...inputStyle }}
                                            />
                                        </div>
                                    </div>

                                    {/* Senha */}
                                    <div style={{ marginBottom: 6 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-2)' }}>Senha</span>
                                            <a href="#" style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none', transition: 'color 0.15s' }}
                                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
                                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                                                Esqueceu a senha?
                                            </a>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                                                <IconLock />
                                            </span>
                                            <input
                                                type={showLoginPass ? 'text' : 'password'} required placeholder="••••••••"
                                                value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                                                style={{ ...inputStyle, paddingRight: 36 }}
                                            />
                                            <button type="button" onClick={() => setShowLoginPass(p => !p)} style={{
                                                position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                color: 'var(--text-3)', padding: 2, display: 'flex', alignItems: 'center',
                                            }}>
                                                {showLoginPass ? <IconEyeOff /> : <IconEye />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit" disabled={loginLoading}
                                        style={{
                                            width: '100%', padding: '10px 14px',
                                            borderRadius: 8, border: 'none',
                                            background: 'var(--green)', color: '#000',
                                            fontSize: 13.5, fontFamily: 'var(--font)', fontWeight: 600,
                                            cursor: loginLoading ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                            marginTop: 20, transition: 'all 0.15s',
                                            opacity: loginLoading ? 0.7 : 1,
                                        }}
                                        onMouseEnter={e => { if (!loginLoading) { (e.currentTarget as HTMLElement).style.background = '#00e876'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(0,210,106,0.22)'; } }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--green)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                                    >
                                        {loginLoading ? 'Entrando...' : (<>Entrar na conta <IconArrow /></>)}
                                    </button>

                                    {needsConfirmation && (
                                        <div style={{ marginTop: 16, textAlign: 'center' }}>
                                            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
                                                Não recebeu o email?
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleResendConfirmation}
                                                disabled={resending}
                                                style={{
                                                    fontSize: 12,
                                                    color: 'var(--green)',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: resending ? 'not-allowed' : 'pointer',
                                                    fontWeight: 500,
                                                    textDecoration: 'underline',
                                                }}
                                            >
                                                {resending ? 'Reenviando...' : 'Reenviar email de confirmação'}
                                            </button>
                                        </div>
                                    )}
                                </form>
                            </div>

                            <div style={{
                                padding: '16px 28px', borderTop: '1px solid var(--border)',
                                textAlign: 'center', background: 'rgba(255,255,255,0.015)',
                            }}>
                                <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
                                    Não tem conta?{' '}
                                    <button onClick={() => setTab('cadastro')} style={{
                                        color: 'var(--green)', fontWeight: 500, background: 'none', border: 'none',
                                        fontSize: 13, fontFamily: 'var(--font)', cursor: 'pointer',
                                    }}>
                                        Criar agora
                                    </button>
                                </p>
                            </div>
                        </>
                    )}

                    {/* ── CADASTRO PANEL ── */}
                    {tab === 'cadastro' && (
                        <>
                            <div style={{
                                padding: '28px 28px 24px',
                                borderBottom: '1px solid var(--border)',
                                textAlign: 'center',
                            }}>
                                <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-1)', marginBottom: 5 }}>
                                    Crie sua conta
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Comece a disparar emails em minutos</div>
                            </div>

                            <div style={{ padding: '24px 28px' }}>
                                {/* Google */}
                                <button
                                    onClick={handleGoogleLogin}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                                        padding: '9px 14px', borderRadius: 8,
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        background: 'var(--surface-2)', color: 'var(--text-2)',
                                        fontSize: 13.5, fontFamily: 'var(--font)', fontWeight: 400,
                                        cursor: 'pointer', marginBottom: 16, transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
                                >
                                    <IconGoogle /> Continuar com Google
                                </button>

                                {/* Divider */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                    <span style={{ fontSize: 11.5, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>ou cadastre com email</span>
                                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                </div>

                                <form onSubmit={handleSignup}>
                                    {/* Name row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                                        {[
                                            { label: 'Nome', placeholder: 'Seu nome', value: firstName, onChange: setFirstName },
                                            { label: 'Sobrenome', placeholder: 'Sobrenome', value: lastName, onChange: setLastName },
                                        ].map(({ label, placeholder, value, onChange }) => (
                                            <div key={label}>
                                                <div style={{ marginBottom: 6 }}>
                                                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-2)' }}>{label}</span>
                                                </div>
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                                                        <IconUser />
                                                    </span>
                                                    <input
                                                        type="text" placeholder={placeholder}
                                                        value={value} onChange={e => onChange(e.target.value)}
                                                        style={{ ...inputStyle }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Email */}
                                    <div style={{ marginBottom: 14 }}>
                                        <div style={{ marginBottom: 6 }}>
                                            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-2)' }}>Email</span>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                                                <IconEmail />
                                            </span>
                                            <input
                                                type="email" required placeholder="voce@empresa.com"
                                                value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                                                style={{ ...inputStyle }}
                                            />
                                        </div>
                                    </div>

                                    {/* Senha */}
                                    <div style={{ marginBottom: 6 }}>
                                        <div style={{ marginBottom: 6 }}>
                                            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-2)' }}>Senha</span>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                                                <IconLock />
                                            </span>
                                            <input
                                                type={showSignupPass ? 'text' : 'password'} required placeholder="Mín. 8 caracteres"
                                                value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                                                style={{ ...inputStyle, paddingRight: 36 }}
                                            />
                                            <button type="button" onClick={() => setShowSignupPass(p => !p)} style={{
                                                position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                color: 'var(--text-3)', padding: 2, display: 'flex', alignItems: 'center',
                                            }}>
                                                {showSignupPass ? <IconEyeOff /> : <IconEye />}
                                            </button>
                                        </div>
                                        <StrengthBar password={signupPassword} />
                                    </div>

                                    <button
                                        type="submit" disabled={signupLoading}
                                        style={{
                                            width: '100%', padding: '10px 14px',
                                            borderRadius: 8, border: 'none',
                                            background: 'var(--green)', color: '#000',
                                            fontSize: 13.5, fontFamily: 'var(--font)', fontWeight: 600,
                                            cursor: signupLoading ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                            marginTop: 20, transition: 'all 0.15s',
                                            opacity: signupLoading ? 0.7 : 1,
                                        }}
                                        onMouseEnter={e => { if (!signupLoading) { (e.currentTarget as HTMLElement).style.background = '#00e876'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(0,210,106,0.22)'; } }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--green)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                                    >
                                        {signupLoading ? 'Criando conta...' : (<>Criar conta grátis <IconArrow /></>)}
                                    </button>

                                    <p style={{ fontSize: 11.5, color: 'var(--text-3)', textAlign: 'center', marginTop: 14, lineHeight: 1.55 }}>
                                        Ao criar sua conta, você concorda com os{' '}
                                        <a href="#" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Termos de Uso</a>
                                        {' '}e a{' '}
                                        <a href="#" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Política de Privacidade</a>.
                                    </p>
                                </form>
                            </div>

                            <div style={{
                                padding: '16px 28px', borderTop: '1px solid var(--border)',
                                textAlign: 'center', background: 'rgba(255,255,255,0.015)',
                            }}>
                                <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
                                    Já tem conta?{' '}
                                    <button onClick={() => setTab('login')} style={{
                                        color: 'var(--green)', fontWeight: 500, background: 'none', border: 'none',
                                        fontSize: 13, fontFamily: 'var(--font)', cursor: 'pointer',
                                    }}>
                                        Entrar
                                    </button>
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Trust signals */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 20 }}>
                    {[
                        { text: 'Sem cartão de crédito', icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.4"><path d="M6 1l1.2 3.6H11L8.1 6.9l1.2 3.6L6 8.2l-3.3 2.3 1.2-3.6L1 4.6h3.8z" /></svg> },
                        { text: 'SSL & dados seguros', icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.4"><rect x="1" y="5" width="10" height="7" rx="1" /><path d="M3.5 5V3.5a2.5 2.5 0 015 0V5" /></svg> },
                        { text: 'Cancele a qualquer hora', icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.4"><path d="M2 6l3 3 5-5" /></svg> },
                    ].map(({ text, icon }) => (
                        <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--text-3)' }}>
                            {icon} {text}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ── Final Export with Suspense ──────────────────────────────
export default function AuthPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: 'var(--green)' }}>Carregando...</div>
            </div>
        }>
            <AuthContent />
        </Suspense>
    )
}
