import { requireSession } from '@/lib/auth';

export default async function InboxPage() {
  await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Messages</p>
        <h2 className="text-2xl font-semibold">Inbox</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Consultez vos notifications et messages.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <p className="text-muted-foreground">Aucun message pour le moment.</p>
      </div>
    </div>
  );
}
