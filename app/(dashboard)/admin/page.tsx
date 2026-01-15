import { redirect } from 'next/navigation';

// La page /admin redirige vers /spaces
// Les sous-pages /admin/[tenantId] restent pour la gestion détaillée des tenants
export default function AdminPage() {
  redirect('/spaces');
}
