'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkUrl: string;
  onLinkUrlChange: (url: string) => void;
  onApply: () => void;
}

export function LinkDialog({ open, onOpenChange, linkUrl, onLinkUrlChange, onApply }: LinkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un lien</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="https://..."
          value={linkUrl}
          onChange={(e) => onLinkUrlChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onApply()}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onApply}>Appliquer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
