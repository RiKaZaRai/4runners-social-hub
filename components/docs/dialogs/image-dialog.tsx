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

interface ImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  onInsert: () => void;
}

export function ImageDialog({ open, onOpenChange, imageUrl, onImageUrlChange, onInsert }: ImageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inserer une image</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="URL de l'image..."
          value={imageUrl}
          onChange={(e) => onImageUrlChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onInsert()}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onInsert} disabled={!imageUrl}>
            Inserer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
