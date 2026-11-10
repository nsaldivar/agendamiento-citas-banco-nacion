import PublicLandingClient from './PublicLandingClient';

// Forzar renderizado dinámico para consultas siempre en vivo a Supabase
export const dynamic = 'force-dynamic';

export default function PublicLandingPage() {
  return <PublicLandingClient />;
}
