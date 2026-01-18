# Plan Technique – Affichage global du menu secondaire au hover

**Feature :** 2026-01-18-secondary-menu-global-hover
**Date :** 2026-01-18

---

## Vue d'ensemble

Déplacer le rendu du menu secondaire du niveau page vers le niveau global (DashboardShell) pour permettre son affichage au hover depuis n'importe quelle page.

---

## Architecture actuelle

### Problème

**Actuellement :**
- `WikiStructured` (page component) rend son propre menu secondaire inline
- Le menu n'existe que quand on est sur `/wiki`
- Impossible d'afficher le menu au hover depuis `/home`

**Fichiers concernés :**
- `app/(dashboard)/layout.tsx` - Layout principal
- `components/navigation/dashboard-shell.tsx` - Wrapper de navigation
- `components/wiki/wiki-structured.tsx` - Composant wiki qui rend le sidebar inline
- `components/wiki/wiki-sidebar.tsx` - Contenu du menu secondaire wiki

---

## Solution technique

### Architecture cible

```
DashboardShell (global)
├── NavProvider (context)
├── MainSidebar (menu principal)
├── GlobalSecondarySidebar ← NOUVEAU (rendu conditionnel basé sur activePrimaryItem)
│   ├── WikiSidebar (si activePrimaryItem === 'wiki')
│   └── SpacesSidebar (si activePrimaryItem === 'spaces', futur)
└── children (contenu de page)
```

### Étape 1 : Créer GlobalSecondarySidebar

**Nouveau fichier : `components/navigation/global-secondary-sidebar.tsx`**

```typescript
'use client';

import { useNav } from './nav-context';
import { WikiSidebar } from '@/components/wiki/wiki-sidebar';
import { SecondarySidebar } from './secondary-sidebar';

interface GlobalSecondarySidebarProps {
  wikiData: {
    sections: Array<{ id: string; name: string; /* ... */ }>;
    documents: Array<{ id: string; title: string; /* ... */ }>;
  } | null;
}

export function GlobalSecondarySidebar({ wikiData }: GlobalSecondarySidebarProps) {
  const { activePrimaryItem, isSecondaryVisible, isCompactMode } = useNav();

  // Only show in compact mode when secondary is visible
  if (!isCompactMode || !isSecondaryVisible || !activePrimaryItem) {
    return null;
  }

  // Render appropriate sidebar based on active item
  let content = null;

  if (activePrimaryItem === 'wiki' && wikiData) {
    content = (
      <WikiSidebar
        sections={wikiData.sections}
        documents={wikiData.documents}
        basePath="/wiki"
      />
    );
  }

  // Future: add spaces sidebar
  // if (activePrimaryItem === 'spaces' && spacesData) {
  //   content = <SpacesSidebar data={spacesData} />;
  // }

  if (!content) return null;

  return <SecondarySidebar>{content}</SecondarySidebar>;
}
```

### Étape 2 : Modifier DashboardShell

**Fichier : `components/navigation/dashboard-shell.tsx`**

Ajouter les props pour les données wiki :

```typescript
interface DashboardShellProps {
  children: React.ReactNode;
  userName: string;
  isClient: boolean;
  isAdmin: boolean;
  spacesPreview: Array<{/*...*/}>;
  canCreateClients: boolean;
  wikiData: {  // ← AJOUT
    sections: SectionWithFoldersAndDocs[];
    documents: DocumentFull[];
  } | null;
}
```

Rendre le GlobalSecondarySidebar :

```typescript
import { GlobalSecondarySidebar } from './global-secondary-sidebar';

function DashboardContent({ children, wikiData, /* ... */ }: DashboardShellProps) {
  const { isCompactMode } = useNav();
  const mainMargin = isCompactMode ? 'ml-[72px]' : 'ml-64';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MainSidebar {...sidebarProps} />

      {/* Menu secondaire global */}
      <GlobalSecondarySidebar wikiData={wikiData} />  {/* ← AJOUT */}

      <div className={`flex min-h-screen flex-1 flex-col ${mainMargin}`}>
        {/* header et main */}
      </div>
    </div>
  );
}
```

### Étape 3 : Charger les données wiki au niveau layout

**Fichier : `app/(dashboard)/layout.tsx`**

Ajouter une query pour charger les données wiki :

```typescript
import { prisma } from '@/lib/db';

export default async function DashboardLayout({ children }) {
  const session = await requireSession();

  // Existing queries...
  const [user, spacesPreview] = await Promise.all([...]);

  // Load wiki data for global secondary sidebar
  let wikiData = null;
  if (!isClient) {  // Only load for non-clients
    const [sections, documents] = await Promise.all([
      prisma.wikiSection.findMany({
        where: { tenantId: session.tenantId },
        include: {
          folders: {
            orderBy: { name: 'asc' },
            include: {
              documents: { orderBy: { title: 'asc' } }
            }
          }
        },
        orderBy: { order: 'asc' }
      }),
      prisma.wikiDocument.findMany({
        where: {
          tenantId: session.tenantId,
          folderId: null  // Root documents
        },
        orderBy: { title: 'asc' }
      })
    ]);

    wikiData = { sections, documents };
  }

  return (
    <DashboardShell
      userName={user.name}
      isClient={isClient}
      isAdmin={isAdmin}
      spacesPreview={spacesPreview}
      canCreateClients={canCreateClients}
      wikiData={wikiData}  // ← AJOUT
    >
      {children}
    </DashboardShell>
  );
}
```

### Étape 4 : Supprimer le menu secondaire inline de WikiStructured

**Fichier : `components/wiki/wiki-structured.tsx`**

Supprimer tout le code de rendu du sidebar (lignes ~640-810) et le remplacer par un simple wrapper :

```typescript
// Supprimer showSidebar, le rendu conditionnel du sidebar, etc.
// Le sidebar est maintenant géré globalement

return (
  <div className="min-h-full text-foreground">
    <div className="fixed inset-0 -z-10 bg-[...]" />

    {/* Juste le contenu principal, pas de sidebar */}
    <div className="mx-auto max-w-5xl px-8 py-8">
      {/* Toolbar, content, etc. */}
    </div>
  </div>
);
```

### Étape 5 : Adapter WikiSidebar pour usage global

**Fichier : `components/wiki/wiki-sidebar.tsx`**

S'assurer que WikiSidebar peut être utilisé de manière standalone :

- Recevoir `basePath` en props
- Utiliser `useRouter()` pour la navigation
- Gérer la sélection basée sur `pathname` ou props

**Modification minimale attendue :** déjà en place, juste vérifier compatibilité.

---

## Fichiers modifiés

### Nouveaux fichiers
- `components/navigation/global-secondary-sidebar.tsx`

### Fichiers modifiés
- `components/navigation/dashboard-shell.tsx`
  - Ajout de `wikiData` en props
  - Rendu de `GlobalSecondarySidebar`

- `app/(dashboard)/layout.tsx`
  - Ajout de la query wiki
  - Passage de `wikiData` à `DashboardShell`

- `components/wiki/wiki-structured.tsx`
  - Suppression du rendu inline du sidebar
  - Simplification du layout

- `components/wiki/wiki-sidebar.tsx`
  - Vérification/ajustements mineurs pour usage global

---

## Gestion des données

### Query Prisma

```typescript
// Sections avec folders et documents
prisma.wikiSection.findMany({
  where: { tenantId },
  include: {
    folders: {
      orderBy: { name: 'asc' },
      include: {
        documents: {
          orderBy: { title: 'asc' },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            // Pas le content pour alléger
          }
        }
      }
    }
  },
  orderBy: { order: 'asc' }
});

// Root documents (sans folder)
prisma.wikiDocument.findMany({
  where: {
    tenantId,
    folderId: null
  },
  orderBy: { title: 'asc' },
  select: {
    id: true,
    title: true,
    updatedAt: true,
  }
});
```

**Impact performance :**
- 2 queries supplémentaires au chargement du layout
- Données légères (metadata uniquement, pas de content)
- Mise en cache automatique par React (RSC)

---

## Tests manuels requis

### Scénario 1 : Hover depuis Home
1. Naviguer vers `/home`
2. Mode compact (< 1760px)
3. Survoler "Wiki"
4. ✅ Menu secondaire s'affiche après 120ms
5. ✅ Contenu identique au menu quand on est sur wiki

### Scénario 2 : Navigation depuis menu
1. Depuis Home, hover sur Wiki
2. Cliquer sur un document dans le menu
3. ✅ Navigation vers `/wiki/[docId]`
4. ✅ Menu reste affiché

### Scénario 3 : Pin/Unpin
1. Depuis Home, hover sur Wiki
2. Cliquer sur pin
3. ✅ Menu reste affiché
4. Naviguer vers Settings
5. ✅ Menu wiki reste visible (pinned)
6. Cliquer unpin
7. ✅ Menu se cache

### Scénario 4 : Sur page wiki
1. Naviguer vers `/wiki`
2. ✅ Menu secondaire fonctionne normalement
3. ✅ Pas de régression

### Scénario 5 : Mode comfort
1. Passer en mode >= 1760px
2. ✅ Comportement inchangé

---

## Risques techniques

### Risque moyen

**Chargement des données wiki au niveau layout :**
- **Impact** : Toutes les pages chargent les données wiki, même si non utilisées
- **Mitigation** :
  - Données légères (metadata uniquement)
  - Query rapide (index sur tenantId)
  - Condition `if (!isClient)` pour éviter chargement inutile
  - Mise en cache RSC

**Conflit potentiel entre sidebar global et sidebar de page :**
- **Impact** : Si on est sur wiki, il pourrait y avoir deux sidebars
- **Mitigation** : WikiStructured ne rend plus son sidebar, délégation totale au global

### Points d'attention

- Vérifier que WikiSidebar fonctionne bien en mode standalone
- S'assurer que la navigation fonctionne depuis le menu global
- Tester le comportement de pin/unpin
- Vérifier les transitions et animations

---

## Déploiement

### Checklist pré-déploiement

1. `pnpm build` → doit passer ✅
2. Tests manuels des 5 scénarios
3. Vérification performance (Network tab, temps de chargement)
4. Test sur différentes tailles d'écran

### Rollback

Rollback simple via git si problème :
- Aucune migration DB
- Changements isolés dans quelques fichiers
- Comportement précédent restaurable

---

## Impact performance

**Estimation :**
- **Chargement initial** : +50-100ms (2 queries supplémentaires)
- **Runtime** : aucun impact (composant conditionnel)
- **Bundle size** : +2-3KB (nouveau composant)

**Acceptable pour V1** : gain UX justifie le coût

---

## Alternatives considérées

### Alternative 1 : Lazy loading au hover

**Approche :** Charger les données wiki uniquement au hover

**Rejetée car :**
- Complexité accrue (gestion du loading state)
- Délai au hover (requête + rendu)
- Sur-ingénierie pour V1

### Alternative 2 : Portail React

**Approche :** Utiliser un portail pour rendre le sidebar wiki existant

**Rejetée car :**
- Le composant wiki n'existe pas quand on n'est pas sur wiki
- Nécessite quand même les données au niveau global
- Plus complexe sans gain réel

### Alternative 3 : iFrame ou SSR streaming

**Rejetée car :** sur-ingénierie évidente
