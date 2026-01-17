import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAgencyRole } from '@/lib/roles';
import { WikiStructured } from '@/components/wiki';

export default async function WikiStructuredPage() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!user || !isAgencyRole(user.role)) {
    redirect('/spaces');
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <WikiStructured />
    </div>
  );
}
