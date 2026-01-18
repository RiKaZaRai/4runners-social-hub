# Plan Technique – Uniformisation du hover de navigation

**Feature :** 2026-01-18-navigation-hover-uniformisation
**Date :** 2026-01-18

---

## Vue d'ensemble

Séparation de la logique de style visuel et de la gestion du menu secondaire en supprimant l'utilisation de `activePrimaryItem` pour le style, et en utilisant uniquement le CSS `:hover` pour l'effet de survol.

---

## Architecture actuelle

### Problème identifié

**Dans `main-sidebar.tsx`, ligne 116 et 126-129 (mode compact) :**

```typescript
const isHovered = activePrimaryItem === item.id;

// ...

className={cn(
  'group flex w-full flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition',
  active || isHovered  // ← PROBLÈME : isHovered affecte le style
    ? 'border-primary/30 bg-primary/10'
    : 'border-transparent hover:border-border/60 hover:bg-muted/50'
)}
```

**Conséquence :**
- Quand on survole Spaces/Wiki, `showSecondary()` est appelé
- Cela set `activePrimaryItem` à 'spaces' ou 'wiki'
- `isHovered` devient `true`
- L'onglet reste bleu même après mouseLeave
- Le hover CSS (border-border/60, bg-muted/50) n'est jamais appliqué sur les onglets avec secondary

---

## Solution technique

### Approche choisie

1. Retirer `isHovered` de la condition de style
2. Utiliser uniquement `active` (basé sur pathname) pour l'état permanent
3. Laisser le CSS `:hover` gérer l'effet de survol pour TOUS les onglets
4. Conserver `activePrimaryItem` uniquement pour la logique du menu secondaire

### Modification : `main-sidebar.tsx`

**Ligne ~114-116 (mode compact) - SUPPRIMER `isHovered` :**

```typescript
const active = isActive(item.href);
const hasSecondary = 'hasSecondary' in item && item.hasSecondary;
// Supprimer : const isHovered = activePrimaryItem === item.id;
```

**Ligne ~126-129 - Modifier la condition de style :**

```typescript
className={cn(
  'group flex w-full flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition',
  active  // ← Uniquement 'active', pas 'isHovered'
    ? 'border-primary/30 bg-primary/10'
    : 'border-transparent hover:border-border/60 hover:bg-muted/50'
)}
```

**Ligne ~134-137 - Même chose pour l'icône :**

```typescript
<Icon
  className={cn(
    'h-5 w-5',
    active  // ← Uniquement 'active'
      ? 'text-primary'
      : 'text-muted-foreground group-hover:text-foreground'
  )}
/>
```

**Ligne ~140-143 - Même chose pour le texte :**

```typescript
<span
  className={cn(
    'text-[10px] leading-tight',
    active ? 'text-primary font-medium' : 'text-muted-foreground'
  )}
>
```

**Note :** Les lignes Settings (mode compact) n'ont pas besoin de changement car elles n'utilisent déjà pas `isHovered`.

---

## Fichiers modifiés

- `components/navigation/main-sidebar.tsx`

**Aucun changement dans d'autres fichiers.**

---

## Comportement résultant

### Avant
1. Survol de Wiki → `activePrimaryItem = 'wiki'` → `isHovered = true` → **Style bleu permanent**
2. Menu secondaire s'affiche après 120ms
3. MouseLeave → Menu se cache mais **style bleu reste** car `activePrimaryItem` n'est pas reset

### Après
1. Survol de Wiki → `activePrimaryItem = 'wiki'` → Menu secondaire va s'afficher
2. **Style hover CSS** s'applique : border-border/60, bg-muted/50
3. MouseLeave → **Hover CSS disparaît**, menu se cache
4. Seul l'onglet actif (basé sur pathname) garde le style bleu permanent

---

## Tests manuels requis

### Scénario 1 : Hover uniforme
1. Mode compact (< 1760px)
2. Survoler chaque onglet (Home, Inbox, Spaces, Wiki, Settings)
3. ✅ Vérifier que tous ont le MÊME effet de hover
4. ✅ Vérifier que le hover disparaît au mouseLeave

### Scénario 2 : État actif préservé
1. Naviguer vers `/wiki`
2. ✅ Vérifier que Wiki a le style bleu permanent (actif)
3. Survoler Home
4. ✅ Vérifier que Home a le hover, Wiki garde son style actif
5. Cliquer sur Home
6. ✅ Vérifier que seul Home est actif (bleu permanent)

### Scénario 3 : Menu secondaire toujours fonctionnel
1. Survoler Spaces/Wiki
2. ✅ Vérifier que le menu secondaire s'affiche après 120ms
3. ✅ Vérifier que le pinned fonctionne toujours
4. MouseLeave avec menu non-pinned
5. ✅ Vérifier que le menu se cache

### Scénario 4 : Mode comfort (non-régression)
1. Passer en mode comfort (>= 1760px)
2. ✅ Vérifier que le comportement est inchangé

---

## Risques techniques

### Risque minimal

- **Impact très limité** : suppression d'une variable et simplification de conditions
- **Pas de nouvelle logique** : on retire de la complexité
- **CSS vanilla** : utilisation de :hover standard
- **Pas de migration DB**
- **Pas de changement d'API**

### Points d'attention

- S'assurer que le menu secondaire continue de s'afficher (activePrimaryItem est toujours géré)
- Vérifier que le pinned fonctionne toujours
- Tester le hover sur tous les onglets

---

## Déploiement

### Checklist pré-déploiement

1. `pnpm build` → doit passer ✅
2. Tests manuels des 4 scénarios ci-dessus
3. Vérification visuelle de tous les états (actif, hover, actif+hover)

### Rollback

Simple revert git si problème :
- Aucune migration DB
- Aucun state persisté
- Simple changement de style

---

## Impact performance

**Amélioration légère** :
- Une variable en moins (`isHovered`)
- Conditions simplifiées
- Pas de re-render supplémentaire

---

## Alternatives considérées

### Alternative 1 : Créer un état hover séparé

**Approche :** Ajouter un `hoveredItem` dans le contexte distinct de `activePrimaryItem`.

**Rejetée car :**
- Plus complexe (state supplémentaire)
- CSS :hover suffit pour l'effet visuel
- Sur-ingénierie

### Alternative 2 : Reset activePrimaryItem au mouseLeave

**Approche :** Reset `activePrimaryItem` à `null` quand on quitte le survol.

**Rejetée car :**
- Ne règle pas le problème de base (confusion style vs logique)
- Plus fragile (timing issues avec le menu secondaire)
- Ne simplifie pas le code
