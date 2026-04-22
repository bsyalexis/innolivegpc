'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        toast.error('Identifiants incorrects')
        setLoading(false)
        return
      }

      const role = data.user?.user_metadata?.role
      if (role === 'CLIENT') {
        router.push('/client')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch {
      toast.error('Erreur de connexion, veuillez réessayer')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">

      {/* Ghost background word */}
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
        aria-hidden
      >
        <span
          className="ghost-word text-[20vw] leading-none"
          style={{ WebkitTextStroke: '2px rgba(10,10,10,0.04)', color: 'transparent' }}
        >
          INNOLIVE
        </span>
      </div>

      <div className="relative w-full max-w-sm z-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="logo-mark" style={{ width: 36, height: 36, borderRadius: 11 }} />
            <span className="wordmark text-[28px] leading-none text-[var(--foreground)]">
              INNOLIVE<span style={{ color: 'var(--blue)' }}>.</span>
            </span>
          </div>
          <p className="text-[13px] text-[var(--muted-foreground)]">
            Connectez-vous à votre espace
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-[var(--card)] border border-[var(--border)] rounded-[22px] p-6 space-y-4"
          style={{ boxShadow: '0 20px 60px rgba(10,10,10,0.08)' }}
        >
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-semibold text-[var(--foreground)]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@innolive.fr"
                required
                className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] rounded-xl h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-semibold text-[var(--foreground)]">
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] rounded-xl h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[var(--ink)] text-white font-semibold text-[14px] transition-transform hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Connexion…
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[12px] text-[var(--muted-foreground)] mt-5">
          Accès réservé à l&apos;équipe Innolive et aux clients invités.
        </p>
      </div>
    </div>
  )
}
