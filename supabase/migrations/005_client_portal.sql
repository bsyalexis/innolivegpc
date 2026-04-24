-- ============================================================
-- SAAS GPC — Innolive
-- Migration 005 : Portail client enrichi — table invoices
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- FACTURES (invoices)
-- Créées par ADMIN/TEAM, visibles par le client concerné
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.invoices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id   uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title        text NOT NULL,
  amount       numeric(12, 2) NOT NULL,
  status       text NOT NULL DEFAULT 'en_attente'
                 CHECK (status IN ('en_attente', 'payee', 'en_retard')),
  due_date     date,
  paid_at      timestamptz,
  description  text,
  created_by   uuid NOT NULL REFERENCES public.users(id),
  created_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ADMIN/TEAM : accès complet
CREATE POLICY "invoices_team_all" ON public.invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'TEAM'))
  );

-- CLIENT : lecture uniquement de ses propres factures
CREATE POLICY "invoices_client_select" ON public.invoices
  FOR SELECT USING (client_id = auth.uid());

-- Index de performance
CREATE INDEX idx_invoices_client_id  ON public.invoices(client_id);
CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX idx_invoices_status     ON public.invoices(status);

-- ──────────────────────────────────────────────────────────
-- NOTIFICATION : nouvelle facture → notifie le client
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_invoice()
RETURNS trigger AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.client_id,
    'projet_mis_a_jour',
    'Nouvelle facture disponible — ' || NEW.title,
    'Montant : ' || NEW.amount || ' €',
    '/client/factures'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_invoice
  AFTER INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_invoice();
