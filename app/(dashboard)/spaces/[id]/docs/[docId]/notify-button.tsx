'use client';

import { useState, useTransition } from 'react';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notifyDocumentUpdate } from '@/lib/actions/documents';

interface NotifyButtonProps {
  docId: string;
}

export function NotifyButton({ docId }: NotifyButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [notified, setNotified] = useState(false);

  const handleNotify = () => {
    startTransition(async () => {
      await notifyDocumentUpdate(docId);
      setNotified(true);
      setTimeout(() => setNotified(false), 3000);
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleNotify}
      disabled={isPending || notified}
    >
      {notified ? (
        <>
          <Check className="mr-2 h-4 w-4 text-green-500" />
          Notifie
        </>
      ) : (
        <>
          <Bell className="mr-2 h-4 w-4" />
          Notifier
        </>
      )}
    </Button>
  );
}
