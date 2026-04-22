-- Migration 004 : tâches indépendantes + tags sur tâches

-- 1. Rendre project_id nullable (tâches sans projet = tâche interne)
ALTER TABLE public.tasks ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- 2. Ajouter le champ tags aux tâches
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
