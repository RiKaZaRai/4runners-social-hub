'use client';

import { ArrowLeft, Clock, Timer, Tag, Link2, Pencil, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WikiDoc } from './wiki-data';

interface WikiDocViewProps {
  doc: WikiDoc | null;
  docId: string;
  onOpen: (id: string) => void;
  onBackHome: () => void;
  onEdit?: () => void;
}

// Fallback content for documents not in the mock data
function getFallbackDoc(docId: string): WikiDoc {
  return {
    id: docId,
    title: 'Document',
    meta: { updated: '—', tags: ['—'], readingTime: '—' },
    content: {
      h1: 'Contenu',
      p1: "Contenu non détaillé dans cette preview. L'important ici est la structure : meta, navigation, liens internes.",
      steps: [
        'Ajouter un titre clair',
        'Structurer en étapes',
        'Créer des liens internes'
      ],
      links: [{ label: 'Retour accueil Wiki', to: 'home' }]
    }
  };
}

export function WikiDocView({ doc, docId, onOpen, onBackHome, onEdit }: WikiDocViewProps) {
  const displayDoc = doc || getFallbackDoc(docId);

  return (
    <div className="space-y-6">
      {/* Top actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="outline" onClick={onBackHome}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Accueil Wiki
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            {displayDoc.meta.updated}
          </Badge>
          <Badge variant="outline">
            <Timer className="mr-1 h-3 w-3" />
            {displayDoc.meta.readingTime}
          </Badge>
          {onEdit && (
            <Button size="sm" onClick={onEdit}>
              <Pencil className="mr-1 h-4 w-4" />
              Éditer
            </Button>
          )}
        </div>
      </div>

      {/* Title and tags */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">{displayDoc.title}</h1>
        <div className="flex flex-wrap gap-2">
          {displayDoc.meta.tags.map((tag) => (
            <Badge key={tag} variant="accent">
              <Tag className="mr-1 h-3 w-3" />
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Content card */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Main heading */}
          <div>
            <h2 className="text-lg font-semibold">{displayDoc.content.h1}</h2>
            <p className="mt-2 text-muted-foreground">{displayDoc.content.p1}</p>
          </div>

          {/* Steps */}
          <div>
            <h3 className="text-sm font-semibold">Étapes</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
              {displayDoc.content.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          {/* Internal links */}
          {displayDoc.content.links.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Liens internes</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {displayDoc.content.links.map((link) => (
                  <Button
                    key={link.to}
                    variant="outline"
                    size="sm"
                    onClick={() => onOpen(link.to)}
                  >
                    <Link2 className="mr-1 h-3 w-3" />
                    {link.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">À améliorer (pattern UX)</CardTitle>
          <Badge variant="default">
            <Lightbulb className="mr-1 h-3 w-3" />
            Guide éditeur
          </Badge>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Chaque doc doit répondre à 1 question (titre orienté action)</li>
            <li>Ajouter "Quand l'utiliser / Quand éviter" sur les process</li>
            <li>Créer des liens internes pour éviter la duplication</li>
            <li>Limiter la profondeur à 2–3 niveaux max</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
