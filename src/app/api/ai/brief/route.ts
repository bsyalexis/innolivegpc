import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, projectName, brief } = await req.json()
  if (!projectName) return NextResponse.json({ error: 'projectName required' }, { status: 400 })

  // Récupère le contexte complet du projet
  const { data: project } = await supabase
    .from('projects')
    .select(`
      name, brief, category, code, budget, deadline, tags,
      client:users!projects_client_id_fkey(full_name),
      members:project_members(user:users(full_name, role))
    `)
    .eq('id', projectId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientName = (project?.client as any)?.full_name as string | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members = (project?.members as any[])?.map((m) => m.user?.full_name).filter(Boolean).join(', ')

  const context = [
    `Projet : ${projectName}`,
    project?.code ? `Code : ${project.code}` : '',
    project?.category ? `Catégorie : ${project.category}` : '',
    clientName ? `Client : ${clientName}` : '',
    members ? `Équipe : ${members}` : '',
    project?.budget ? `Budget : ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(project.budget)}` : '',
    project?.deadline ? `Deadline : ${project.deadline}` : '',
    project?.tags?.length ? `Tags : ${project.tags.join(', ')}` : '',
    brief ? `\nContexte existant :\n${brief}` : '',
  ].filter(Boolean).join('\n')

  const client = new Anthropic()

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Tu es un chef de projet audiovisuel chez Innolive, une agence spécialisée. Génère un brief client professionnel et structuré en français pour ce projet.

Informations disponibles :
${context}

Le brief doit être :
- Rédigé en langage professionnel mais accessible
- Structuré en 3-4 paragraphes courts : contexte, objectifs, livrables attendus, prochaines étapes
- Orienté vers le client (pas l'équipe interne)
- Direct et concret

Génère uniquement le texte du brief, sans titres de sections ni bullet points.`,
    }],
  })

  const generatedBrief = message.content[0].type === 'text' ? message.content[0].text : ''

  return NextResponse.json({ brief: generatedBrief })
}
