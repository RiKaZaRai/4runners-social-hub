import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CsrfInput } from '@/components/csrf-input';

export const dynamic = 'force-dynamic';

export default function LoginPage({
  searchParams
}: {
  searchParams: { message?: string };
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f4efe8,_#f7e9d8,_#f0d9bf)] px-6 py-16">
      <div className="mx-auto max-w-4xl space-y-6">
        {searchParams.message && (
          <div className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground">
            {searchParams.message}
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agence</CardTitle>
            <CardDescription>Connexion par email + mot de passe.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/auth/login" method="post" className="space-y-4">
              <CsrfInput />
              <Input name="email" type="email" placeholder="admin@4runners.local" required />
              <Input name="password" type="password" placeholder="Mot de passe" required />
              <Button type="submit" className="w-full">Se connecter</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Client</CardTitle>
            <CardDescription>Acces par token client ou magic link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action="/api/auth/login" method="post" className="space-y-4">
              <CsrfInput />
              <Input name="accessToken" type="text" placeholder="client-token-123" required />
              <Button type="submit" variant="outline" className="w-full">Entrer avec token</Button>
            </form>
            <div className="rounded-md border border-border bg-muted p-4 text-xs text-muted-foreground">
              <p>Magic link dev (imprime le token dans l'URL).</p>
              <form action="/api/auth/login" method="post" className="mt-3 flex gap-2">
                <CsrfInput />
                <Input name="magicEmail" type="email" placeholder="client@acme.local" required />
                <input type="hidden" name="requestMagic" value="1" />
                <Button type="submit" size="sm">Generer</Button>
              </form>
            </div>
            <form action="/api/auth/login" method="post" className="space-y-3">
              <CsrfInput />
              <Input name="magicToken" type="text" placeholder="Magic token" required />
              <Button type="submit" size="sm" className="w-full">Se connecter avec magic link</Button>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
