export type UserRole = 'ADMIN' | 'TEAM' | 'CLIENT'

export type ProjectCategory = 'creation' | 'publicite' | 'communication' | 'acquisition'

export type ProjectStatus =
  | 'en_brief'
  | 'en_production'
  | 'en_livraison'
  | 'livre'
  | 'archive'

export type TaskStatus = 'a_faire' | 'en_cours' | 'bloque' | 'termine'

export type TaskPriority = 'basse' | 'normale' | 'haute' | 'urgente'

export type ThreadType = 'internal' | 'client'

export type DeliveryStatus = 'en_attente' | 'valide' | 'revision_demandee'

export type NotificationType =
  | 'nouveau_message'
  | 'livraison_disponible'
  | 'livraison_validee'
  | 'revision_demandee'
  | 'tache_assignee'
  | 'projet_mis_a_jour'

// ─── Entités ──────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  created_at: string
  // champs client
  sector?: string | null
  city?: string | null
  mrr?: number | null
  portal_enabled?: boolean
  contact_email?: string | null
  contact_phone?: string | null
}

export interface Project {
  id: string
  name: string
  brief: string | null
  status: ProjectStatus
  deadline: string | null
  client_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  // nouveaux champs
  category?: ProjectCategory | null
  color?: string | null
  code?: string | null
  budget?: number | null
  progress?: number | null
  tags?: string[] | null
  lead_id?: string | null
  // relations jointes
  client?: User
  members?: User[]
}

export interface ProjectMember {
  project_id: string
  user_id: string
  user?: User
}

export interface Task {
  id: string
  project_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string | null
  due_date: string | null
  position: number
  tags?: string[] | null
  created_at: string
  updated_at: string
  // relations jointes
  assignee?: User
  checklist?: TaskChecklistItem[]
  dependencies?: Task[]
}

export interface TaskChecklistItem {
  id: string
  task_id: string
  label: string
  completed: boolean
  position: number
}

export interface TaskDependency {
  task_id: string
  depends_on_id: string
}

export interface Message {
  id: string
  project_id: string
  author_id: string
  content: string
  thread_type: ThreadType
  created_at: string
  updated_at: string
  // relations jointes
  author?: User
  attachments?: MessageAttachment[]
}

export interface MessageAttachment {
  id: string
  message_id: string
  filename: string
  drive_url: string
  created_at: string
}

export interface Delivery {
  id: string
  project_id: string
  title: string
  drive_folder_url: string
  status: DeliveryStatus
  expires_at: string | null
  created_by: string
  validated_at: string | null
  created_at: string
  // relations jointes
  created_by_user?: User
  feedback?: DeliveryFeedback[]
}

export interface DeliveryFeedback {
  id: string
  delivery_id: string
  author_id: string
  comment: string
  created_at: string
  author?: User
}

export interface ClientAccess {
  id: string
  project_id: string
  client_id: string
}

export type InvoiceStatus = 'en_attente' | 'payee' | 'en_retard'

export interface Invoice {
  id: string
  client_id: string
  project_id: string | null
  title: string
  amount: number
  status: InvoiceStatus
  due_date: string | null
  paid_at: string | null
  description: string | null
  created_by: string
  created_at: string
  // relations jointes
  project?: Project
  client?: User
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

// ─── Labels UI ────────────────────────────────────────────────────────────────

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  en_brief: 'En brief',
  en_production: 'En production',
  en_livraison: 'En livraison',
  livre: 'Livré',
  archive: 'Archivé',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  bloque: 'Bloqué',
  termine: 'Terminé',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
  urgente: 'Urgente',
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  en_attente: 'En attente',
  valide: 'Validé',
  revision_demandee: 'Révision demandée',
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  en_attente: 'En attente',
  payee: 'Payée',
  en_retard: 'En retard',
}

export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  creation: 'Création',
  publicite: 'Publicité',
  communication: 'Communication',
  acquisition: 'Acquisition',
}

export const PROJECT_CATEGORY_COLORS: Record<ProjectCategory, string> = {
  creation: 'var(--blue)',
  publicite: 'var(--orange)',
  communication: '#10b981',
  acquisition: '#8b5cf6',
}
