-- ============================================================
-- Migration 002 : Triggers de notifications automatiques
-- ============================================================

-- Fonction générique d'insertion de notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_link text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (p_user_id, p_type, p_title, p_body, p_link);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- Trigger : nouveau message → notifie les membres
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger AS $$
DECLARE
  v_project_name text;
  v_author_name text;
  v_member_id uuid;
  v_client_id uuid;
BEGIN
  SELECT name INTO v_project_name FROM public.projects WHERE id = NEW.project_id;
  SELECT full_name INTO v_author_name FROM public.users WHERE id = NEW.author_id;

  -- Thread interne : notifie les membres de l'équipe (sauf l'auteur)
  IF NEW.thread_type = 'internal' THEN
    FOR v_member_id IN
      SELECT user_id FROM public.project_members
      WHERE project_id = NEW.project_id AND user_id <> NEW.author_id
    LOOP
      PERFORM public.create_notification(
        v_member_id,
        'nouveau_message',
        v_author_name || ' a écrit dans ' || v_project_name,
        left(NEW.content, 100),
        '/dashboard/projects/' || NEW.project_id || '/messages'
      );
    END LOOP;

  -- Thread client : notifie l'équipe + le client
  ELSE
    -- Notifie les membres de l'équipe (sauf l'auteur)
    FOR v_member_id IN
      SELECT user_id FROM public.project_members
      WHERE project_id = NEW.project_id AND user_id <> NEW.author_id
    LOOP
      PERFORM public.create_notification(
        v_member_id,
        'nouveau_message',
        v_author_name || ' a écrit (thread client) — ' || v_project_name,
        left(NEW.content, 100),
        '/dashboard/projects/' || NEW.project_id || '/messages'
      );
    END LOOP;

    -- Notifie le client (sauf s'il est l'auteur)
    SELECT client_id INTO v_client_id FROM public.projects WHERE id = NEW.project_id;
    IF v_client_id IS NOT NULL AND v_client_id <> NEW.author_id THEN
      PERFORM public.create_notification(
        v_client_id,
        'nouveau_message',
        'Nouveau message de ' || v_author_name || ' — ' || v_project_name,
        left(NEW.content, 100),
        '/client/' || NEW.project_id || '/messages'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

-- ─────────────────────────────────────────────
-- Trigger : nouvelle livraison → notifie le client
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_delivery()
RETURNS trigger AS $$
DECLARE
  v_project_name text;
  v_client_id uuid;
BEGIN
  SELECT name, client_id INTO v_project_name, v_client_id
  FROM public.projects WHERE id = NEW.project_id;

  IF v_client_id IS NOT NULL THEN
    PERFORM public.create_notification(
      v_client_id,
      'livraison_disponible',
      'Nouvelle livraison disponible — ' || v_project_name,
      NEW.title,
      '/client/' || NEW.project_id || '/livraison'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_delivery
  AFTER INSERT ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_delivery();

-- ─────────────────────────────────────────────
-- Trigger : statut livraison changé → notifie l'équipe
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_delivery_status()
RETURNS trigger AS $$
DECLARE
  v_project_name text;
  v_member_id uuid;
  v_notif_type text;
  v_title text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_project_name FROM public.projects WHERE id = NEW.project_id;

  IF NEW.status = 'valide' THEN
    v_notif_type := 'livraison_validee';
    v_title := 'Livraison validée par le client — ' || v_project_name;
  ELSIF NEW.status = 'revision_demandee' THEN
    v_notif_type := 'revision_demandee';
    v_title := 'Révision demandée sur la livraison — ' || v_project_name;
  ELSE
    RETURN NEW;
  END IF;

  FOR v_member_id IN
    SELECT user_id FROM public.project_members WHERE project_id = NEW.project_id
  LOOP
    PERFORM public.create_notification(
      v_member_id,
      v_notif_type,
      v_title,
      NEW.title,
      '/dashboard/projects/' || NEW.project_id || '/delivery'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_delivery_status_change
  AFTER UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_delivery_status();

-- ─────────────────────────────────────────────
-- Trigger : tâche assignée → notifie l'assigné
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_task_assign()
RETURNS trigger AS $$
DECLARE
  v_project_name text;
BEGIN
  IF NEW.assignee_id IS NULL THEN RETURN NEW; END IF;
  IF OLD.assignee_id IS NOT DISTINCT FROM NEW.assignee_id THEN RETURN NEW; END IF;

  SELECT p.name INTO v_project_name
  FROM public.projects p WHERE p.id = NEW.project_id;

  PERFORM public.create_notification(
    NEW.assignee_id,
    'tache_assignee',
    'Vous avez été assigné(e) à une tâche — ' || v_project_name,
    NEW.title,
    '/dashboard/projects/' || NEW.project_id || '/tasks'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_assigned
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_task_assign();
