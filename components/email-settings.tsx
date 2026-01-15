'use client';

import { FormEvent, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Toast } from '@/components/toast';

export type EmailStatus = {
  provider?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  domain?: string | null;
  configured: boolean;
};

export function EmailSettingsPanel({ status }: { status: EmailStatus }) {
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!testEmail.trim() || isSending) return;
    setIsSending(true);
    try {
      const response = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail.trim() })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Envoi impossible' }));
        throw new Error(data.error ?? 'Envoi impossible');
      }

      setToastMessage('Email de test envoyé');
      setToastKey((prev) => prev + 1);
      setTestEmail('');
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Erreur');
      setToastKey((prev) => prev + 1);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuration email</CardTitle>
          <CardDescription>
            Cet écran affiche l&apos;état de la configuration SMTP (sans jamais exposer les secrets).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Provider</span>
            <span>{status.provider ?? 'Non défini'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">From</span>
            <span>
              {status.fromName ? `${status.fromName} · ` : ''}
              {status.fromEmail ?? 'Non défini'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Reply-To</span>
            <span>{status.replyTo ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Host / Port</span>
            <span>
              {status.host ?? '—'}
              {status.port ? ` · ${status.port}` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Sécurité</span>
            <Badge variant={status.secure ? 'default' : 'outline'}>
              {status.secure ? 'TLS' : 'Non sécurisé'}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Domaine</span>
            <span>{status.domain ?? '—'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Envoyer un email de test</CardTitle>
          <CardDescription>
            Envoi limité à 3 tentatives toutes les 10 minutes. Configurez vos variables d&apos;environnement avant l&apos;envoi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSend}>
            <div className="space-y-2">
              <Label htmlFor="test-email">Email de test</Label>
              <Input
                id="test-email"
                type="email"
                required
                value={testEmail}
                onChange={(event) => setTestEmail(event.currentTarget.value)}
                disabled={!status.configured || isSending}
              />
            </div>
            <Button type="submit" disabled={isSending || !status.configured}>
              {isSending ? 'Envoi en cours…' : 'Envoyer un email de test'}
            </Button>
            {!status.configured && (
              <p className="text-xs text-muted-foreground">
                La configuration SMTP est incomplète. Vérifiez les variables d&apos;environnement.
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {toastMessage && toastKey > 0 && (
        <Toast message={toastMessage} storageKey={`email-test-toast-${toastKey}`} />
      )}
    </div>
  );
}
