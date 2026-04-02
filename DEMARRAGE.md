# SAAS GPC — Innolive — Guide de démarrage

## Pré-requis

- Node.js 18+
- Un projet Supabase (gratuit sur supabase.com)

---

## 1. Configurer Supabase

### a) Créer le projet

1. Aller sur [supabase.com](https://supabase.com) → New project
2. Nommer le projet `innolive-gpc`
3. Choisir une région (ex: Paris `eu-west-3`)

### b) Appliquer le schéma SQL

Dans le dashboard Supabase → **SQL Editor** → coller et exécuter dans l'ordre :

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_notification_triggers.sql`

### c) Récupérer les clés API

Dans **Settings > API** :
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Configurer les variables d'environnement

Éditer `.env.local` et remplacer les valeurs placeholder :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 3. Créer le premier utilisateur ADMIN

Dans Supabase → **Authentication > Users** → Add user :
- Email : votre email
- Password : votre mot de passe
- Metadata : `{"full_name": "Votre Nom", "role": "ADMIN"}`

---

## 4. Lancer en développement

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## Structure des routes

| Route | Accès | Description |
|---|---|---|
| `/login` | Public | Page de connexion |
| `/dashboard` | ADMIN + TEAM | Vue d'ensemble |
| `/dashboard/projects` | ADMIN + TEAM | Liste des projets |
| `/dashboard/projects/new` | ADMIN + TEAM | Créer un projet |
| `/dashboard/projects/[id]` | ADMIN + TEAM | Détail projet |
| `/dashboard/projects/[id]/tasks` | ADMIN + TEAM | Kanban tâches |
| `/dashboard/projects/[id]/messages` | ADMIN + TEAM | Messagerie (2 threads) |
| `/dashboard/projects/[id]/delivery` | ADMIN + TEAM | Livraisons |
| `/dashboard/notifications` | ADMIN + TEAM | Notifications |
| `/dashboard/settings` | ADMIN only | Gestion utilisateurs |
| `/client` | CLIENT | Liste de mes projets |
| `/client/[id]/messages` | CLIENT | Thread client |
| `/client/[id]/livraison` | CLIENT | Valider les livraisons |

---

## Créer des utilisateurs clients

Via la page `/dashboard/settings` (compte ADMIN requis) — formulaire intégré.

---

## Déploiement (Vercel)

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Ajouter les variables d'env dans le dashboard Vercel
# ou via : vercel env add
```
