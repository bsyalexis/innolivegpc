-- ============================================================
-- SAAS GPC — Innolive
-- Migration 001 : Schéma initial
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────
-- UTILISATEURS
-- Synchronisé avec auth.users de Supabase via trigger
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text UNIQUE NOT NULL,
  full_name   text NOT NULL,
  role        text NOT NULL DEFAULT 'TEAM' CHECK (role IN ('ADMIN', 'TEAM', 'CLIENT')),
  avatar_url  text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Lecture : chaque user se voit lui-même + ADMIN/TEAM voient tout
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'TEAM')
    )
  );

-- ADMIN peut modifier n'importe quel user
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
  );

-- Trigger : créer l'entrée public.users quand un auth.user est créé
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'TEAM'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────────────────
-- PROJETS
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  brief       text,
  status      text NOT NULL DEFAULT 'en_brief' CHECK (
                status IN ('en_brief', 'en_production', 'en_livraison', 'livre', 'archive')
              ),
  deadline    date,
  client_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by  uuid NOT NULL REFERENCES public.users(id),
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ADMIN/TEAM voient tous les projets
CREATE POLICY "projects_team_select" ON public.projects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'TEAM'))
  );

-- ADMIN/TEAM peuvent créer/modifier
CREATE POLICY "projects_team_insert" ON public.projects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'TEAM'))
  );

CREATE POLICY "projects_team_update" ON public.projects
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'TEAM'))
  );

CREATE POLICY "projects_admin_delete" ON public.projects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────
-- MEMBRES DE PROJET
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.project_members (
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_members_team_all" ON public.project_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'TEAM'))
  );

-- ──────────────────────────────────────────────────────────
-- ACCÈS CLIENT
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.client_access (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  UNIQUE (project_id, client_id)
);

ALTER TABLE public.client_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_access_team_all" ON public.client_access
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'TEAM'))
  );

CREATE POLICY "client_access_self_select" ON public.client_access
  FOR SELECT USING (client_id = auth.uid());

-- CLIENT voit uniquement ses projets (défini ici car référence client_access)
CREATE POLICY "projects_client_select" ON public.projects
  FOR SELECT USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.client_access ca
      WHERE ca.project_id = id AND ca.client_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────
-- TÂCHES
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'a_faire' CHECK (
                status IN ('a_faire', 'en_cours', 'bloque', 'termine')
              ),
  priority    text NOT NULL DEFAULT 'normale' CHECK (
                priority IN ('basse', 'normale', 'haute', 'urgente')
              ),
  assignee_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  due_date    date,
  position    integer DEFAULT 0,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_team_all" ON public.tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'TEAM'))
  );

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────
-- CHECKLIST DES TÂCHES
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.task_checklist_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label       text NOT NULL,
  completed   boolean DEFAULT false,
  position    integer DEFAULT 0
);

ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_team_all" ON public.task_checklist_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'TEAM'))
  );

-- ──────────────────────────────────────────────────────────
-- DÉPENDANCES DES TÂCHES
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.task_dependencies (
  task_id       uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on_id),
  CHECK (task_id <> depends_on_id)
);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_deps_team_all" ON public.task_dependencies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'TEAM'))
  );

-- ──────────────────────────────────────────────────────────
-- MESSAGES
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content     text NOT NULL,
  thread_type text NOT NULL CHECK (thread_type IN ('internal', 'client')),
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- TEAM/ADMIN voient tout
CREATE POLICY "messages_team_all" ON public.messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'TEAM'))
  );

-- CLIENT voit uniquement les messages 'client' de ses projets
CREATE POLICY "messages_client_select" ON public.messages
  FOR SELECT USING (
    thread_type = 'client'
    AND (
      EXISTS (
        SELECT 1 FROM public.client_access ca
        WHERE ca.project_id = project_id AND ca.client_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.client_id = auth.uid()
      )
    )
  );

CREATE POLICY "messages_client_insert" ON public.messages
  FOR INSERT WITH CHECK (
    thread_type = 'client'
    AND author_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.client_access ca
        WHERE ca.project_id = project_id AND ca.client_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.client_id = auth.uid()
      )
    )
  );

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────
-- PIÈCES JOINTES DES MESSAGES
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.message_attachments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  filename    text NOT NULL,
  drive_url   text NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_access" ON public.message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
    )
  );

CREATE POLICY "attachments_insert" ON public.message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id AND m.author_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────
-- LIVRAISONS
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.deliveries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title             text NOT NULL,
  drive_folder_url  text NOT NULL,
  status            text NOT NULL DEFAULT 'en_attente' CHECK (
                      status IN ('en_attente', 'valide', 'revision_demandee')
                    ),
  expires_at        timestamptz,
  created_by        uuid NOT NULL REFERENCES public.users(id),
  validated_at      timestamptz,
  created_at        timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deliveries_team_all" ON public.deliveries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'TEAM'))
  );

CREATE POLICY "deliveries_client_select" ON public.deliveries
  FOR SELECT USING (
    (expires_at IS NULL OR expires_at > now())
    AND (
      EXISTS (
        SELECT 1 FROM public.client_access ca
        WHERE ca.project_id = project_id AND ca.client_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.client_id = auth.uid()
      )
    )
  );

CREATE POLICY "deliveries_client_update" ON public.deliveries
  FOR UPDATE USING (
    (
      EXISTS (
        SELECT 1 FROM public.client_access ca
        WHERE ca.project_id = project_id AND ca.client_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.client_id = auth.uid()
      )
    )
  );

-- ──────────────────────────────────────────────────────────
-- FEEDBACK LIVRAISON
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.delivery_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.users(id),
  comment     text NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.delivery_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_feedback_team_all" ON public.delivery_feedback
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'TEAM'))
  );

CREATE POLICY "delivery_feedback_client_all" ON public.delivery_feedback
  FOR ALL USING (author_id = auth.uid());

-- ──────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN (
                'nouveau_message', 'livraison_disponible', 'livraison_validee',
                'revision_demandee', 'tache_assignee', 'projet_mis_a_jour'
              )),
  title       text NOT NULL,
  body        text,
  link        text,
  read        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────
-- INDEX DE PERFORMANCE
-- ──────────────────────────────────────────────────────────
CREATE INDEX idx_projects_client_id     ON public.projects(client_id);
CREATE INDEX idx_projects_status        ON public.projects(status);
CREATE INDEX idx_tasks_project_id       ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee_id      ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status           ON public.tasks(status);
CREATE INDEX idx_messages_project_id    ON public.messages(project_id);
CREATE INDEX idx_messages_thread_type   ON public.messages(project_id, thread_type);
CREATE INDEX idx_deliveries_project_id  ON public.deliveries(project_id);
CREATE INDEX idx_notifications_user_id  ON public.notifications(user_id, read);
CREATE INDEX idx_client_access_client   ON public.client_access(client_id);
