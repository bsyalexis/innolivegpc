import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Désactive la génération statique globale — toutes les pages sont rendues à la requête
  // Nécessaire car Supabase requiert les variables d'environnement à runtime
  output: undefined,
  experimental: {},
};

export default nextConfig;
