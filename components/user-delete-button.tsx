"use client";

import { useState, useTransition } from "react";
import { Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DeleteUserAction = (userId: string) => Promise<void>;

export function UserDeleteButton({
  userId,
  userName,
  onDelete,
}: {
  userId: string;
  userName: string;
  onDelete: DeleteUserAction;
}) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isConfirmed = confirmName === userName;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(userName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setConfirmName("");
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label={`Supprimer ${userName}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer l&apos;utilisateur</DialogTitle>
          <DialogDescription>
            Cette action retire l&apos;accès de manière définitive.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium">
              {userName}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={handleCopy}
              aria-label="Copier le nom"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-user-name">
              Saisissez <span className="font-semibold">{userName}</span> pour confirmer
            </Label>
            <Input
              id="confirm-user-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Nom de l'utilisateur"
              autoComplete="off"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || !isConfirmed}
            onClick={() =>
              startTransition(async () => {
                await onDelete(userId);
                handleOpenChange(false);
              })
            }
          >
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
