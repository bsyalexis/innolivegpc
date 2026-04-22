'use client'

import { useState } from 'react'
import { Globe, ToggleLeft, ToggleRight, Copy, Loader2, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  clientId: string
  portalEnabled: boolean
}

export default function ClientPortalWidget({ clientId, portalEnabled: initial }: Props) {
  const supabase = createClient()
  const [enabled, setEnabled] = useState(initial)
  const [loading, setLoading] = useState(false)

  const portalUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/client`

  async function toggle() {
    setLoading(true)
    const { error } = await supabase.from('users').update({ portal_enabled: !enabled }).eq('id', clientId)
    if (error) { toast.error('Erreur'); setLoading(false); return }
    setEnabled(!enabled)
    toast.success(enabled ? 'Portail désactivé' : 'Portail activé')
    setLoading(false)
  }

  function copyUrl() {
    navigator.clipboard.writeText(portalUrl)
    toast.success('URL copiée')
  }

  return (
    <div
      className="rounded-[18px] p-5 space-y-3"
      style={{
        background: enabled ? 'linear-gradient(135deg, #10b98115, #10b98105)' : 'var(--card)',
        border: enabled ? '1px solid #10b98130' : '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="headline text-[16px] uppercase flex items-center gap-2">
          <Globe size={14} style={{ color: enabled ? '#10b981' : 'var(--muted-foreground)' }} />
          Portail client
        </h2>
        <button onClick={toggle} disabled={loading} className="transition-colors hover:opacity-70">
          {loading
            ? <Loader2 size={20} className="animate-spin text-[var(--muted-foreground)]" />
            : enabled
            ? <ToggleRight size={26} style={{ color: '#10b981' }} />
            : <ToggleLeft size={26} className="text-[var(--muted-foreground)]" />}
        </button>
      </div>

      <p className="text-[12px] text-[var(--muted-foreground)]">
        {enabled
          ? 'Le client peut se connecter et suivre ses projets, livrables et messages.'
          : 'Activez le portail pour donner accès au client.'}
      </p>

      {enabled && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">URL d&apos;accès</p>
          <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-xl px-3 py-2">
            <code className="text-[11px] flex-1 truncate text-[var(--foreground)]">{portalUrl}</code>
            <button onClick={copyUrl} className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              <Copy size={13} />
            </button>
            <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
