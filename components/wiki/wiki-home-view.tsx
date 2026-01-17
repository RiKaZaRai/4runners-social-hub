'use client';

import { FileText, Clock, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DocumentSummary } from '@/lib/actions/documents';

interface WikiHomeViewProps {
  documents: DocumentSummary[];
  recentDocs: DocumentSummary[];
  onOpen: (id: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function WikiHomeView({ documents, recentDocs, onOpen }: WikiHomeViewProps) {
  const hasDocuments = documents.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wiki — Centre de connaissance</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          {hasDocuments
            ? 'Retrouvez vos documents, guides et procédures. Utilisez la recherche ou naviguez dans l\'arborescence.'
            : 'Créez votre premier document pour commencer à construire votre base de connaissances.'}
        </p>
      </div>

      {hasDocuments ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-semibold">Documents récents</CardTitle>
              <Badge variant="default">
                <Clock className="mr-1 h-3 w-3" />
                Dernières modifications
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentDocs.length > 0 ? (
                recentDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => onOpen(doc.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">{doc.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(doc.updatedAt)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucun document récent
                </p>
              )}
            </CardContent>
          </Card>

          {/* All documents count */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-semibold">Statistiques</CardTitle>
              <Badge variant="default">
                <FileText className="mr-1 h-3 w-3" />
                Vue d'ensemble
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border bg-muted/30 p-4 text-center">
                  <div className="text-3xl font-bold">{documents.length}</div>
                  <div className="text-sm text-muted-foreground">
                    {documents.length === 1 ? 'Document' : 'Documents'}
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4 text-center">
                  <div className="text-3xl font-bold">{recentDocs.length}</div>
                  <div className="text-sm text-muted-foreground">
                    Modifiés récemment
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-center text-muted-foreground">
              Aucun document pour le moment.
              <br />
              Utilisez les boutons ci-dessus pour créer votre premier document.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
