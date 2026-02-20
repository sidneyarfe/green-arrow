'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Signup now lives in the unified auth page at /login
export default function SignupPage() {
    const router = useRouter()
    useEffect(() => {
        router.replace('/login?tab=cadastro')
    }, [router])
    return null
}
