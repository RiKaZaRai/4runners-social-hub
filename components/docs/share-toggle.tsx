'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { togglePublicShare } from '@/lib/actions/documents';

interface ShareToggleProps {
  docId: string;
  isPublic: boolean;
  publicToken: string | null;
}

export function ShareToggle({ docId, isPublic, publicToken }: ShareToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDialog, setShowDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = publicToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/doc/${publicToken}`
    : '';

  const handleToggle = async () => {
    startTransition(async () => {
      await togglePublicShare(docId, !isPublic);
      router.refresh();
    });
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
        <Share2 className="mr-2 h-4 w-4" />
        Partager
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partage du document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium">Partage public</p>
                <p className="text-sm text-muted-foreground">
                  {isPublic
                    ? 'Ce document est accessible via un lien public'
                    : 'Ce document est prive'}
                </p>
              </div>
              <Button
                variant={isPublic ? 'default' : 'outline'}
                onClick={handleToggle}
                disabled={isPending}
              >
                {isPending ? '...' : isPublic ? 'Desactiver' : 'Activer'}
              </Button>
            </div>

            {isPublic && publicToken && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Lien de partage</p>
                <div className="flex gap-2">
                  <Input value={publicUrl} readOnly className="text-xs" />
                  <Button variant="outline" size="sm" className="h-9 w-9 shrink-0 p-0" onClick={copyLink}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 w-9 shrink-0 p-0" asChild>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ce lien n&apos;est pas indexe par les moteurs de recherche.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
