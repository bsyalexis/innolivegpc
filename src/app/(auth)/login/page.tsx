'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

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
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Innolive<span className="text-[var(--primary)]">.</span>
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-2">
            Connectez-vous à votre espace
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm text-[var(--foreground)]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@innolive.fr"
                required
                className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm text-[var(--foreground)]">
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
                  className="bg-[var(--input)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--primary)] hover:bg-indigo-500 text-white font-medium"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin mr-2" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--muted-foreground)] mt-6">
          Accès réservé à l&apos;équipe Innolive et aux clients invités.
        </p>
      </div>
    </div>
  )
}
