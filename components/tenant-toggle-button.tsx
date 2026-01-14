"use client";

import { useState, useTransition } from "react";
import { Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ToggleTenantAction = (tenantId: string, active: boolean) => Promise<void>;

export function TenantToggleButton({
  tenantId,
  tenantName,
  active,
  onToggle,
}: {
  tenantId: string;
  tenantName: string;
  active: boolean;
  onToggle: ToggleTenantAction;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const action = active ? "désactiver" : "réactiver";
  const newState = !active;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={active ? "outline" : "secondary"}
          size="sm"
          className="h-8 w-8 p-0"
          aria-label={`${action} ${tenantName}`}
        >
          {active ? (
            <PowerOff className="h-4 w-4" />
          ) : (
            <Power className="h-4 w-4" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {active ? "Désactiver" : "Réactiver"} le client
          </DialogTitle>
          <DialogDescription>
            {active
              ? "Le client sera désactivé mais ses données seront conservées. Les utilisateurs ne pourront plus y accéder."
              : "Le client sera réactivé et les utilisateurs pourront à nouveau y accéder."}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium">
          {tenantName}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant={active ? "secondary" : "default"}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await onToggle(tenantId, newState);
                setOpen(false);
              })
            }
          >
            {active ? "Désactiver" : "Réactiver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
