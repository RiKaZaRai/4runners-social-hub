# Plan Technique – Fix Navigation Active State

**Feature :** 2026-01-18-navigation-active-state-fix
**Date :** 2026-01-18

---

## Vue d'ensemble

Correction du bug de sélection visuelle dans la navigation en mode compact, où l'état `activePrimaryItem` persiste après un clic sur un onglet sans menu secondaire.

---

## Architecture actuelle

### Composants concernés

1. **`components/navigation/nav-context.tsx`**
   - Gère l'état global de navigation via Context API
   - State : `activePrimaryItem: string | null`
   - Actions : `showSecondary()`, `hideSecondary()`, `setActivePrimaryItem()`

2. **`components/navigation/main-sidebar.tsx`**
   - Affiche le menu principal
   - Utilise `activePrimaryItem` pour l'état hover en mode compact
   - Combine `isActive(href)` et `isHovered` pour l'état visuel

### Logique actuelle (ligne 114-116, main-sidebar.tsx)

```typescript
const active = isActive(item.href);
const hasSecondary = 'hasSecondary' in item && item.hasSecondary;
const isHovered = activePrimaryItem === item.id;
```

**Condition de style actif (ligne 126-128) :**
```typescript
active || isHovered
  ? 'border-primary/30 bg-primary/10'
  : 'border-transparent hover:border-border/60 hover:bg-muted/50'
```

### Problème identifié

Quand on clique sur un `<Link>`, Next.js navigue vers la nouvelle page, mais :
- `activePrimaryItem` reste à sa valeur précédente (ex: `'wiki'`)
- L'onglet précédent reste visuellement actif car `isHovered === true`

---

## Solution technique

### Approche choisie

Réinitialiser `activePrimaryItem` à `null` lors du clic sur un onglet **sans menu secondaire**.

### Modification 1 : `main-sidebar.tsx`

**Ajout d'un handler de clic :**

```typescript
// Nouvelle fonction après handleMouseLeave (ligne ~101)
const handleClick = useCallback(
  (itemId: string, hasSecondary: boolean) => {
    if (!hasSecondary) {
      // Reset activePrimaryItem pour les onglets sans menu secondaire
      setActivePrimaryItem(null);
    }
  },
  [setActivePrimaryItem]
);
```

**Mise à jour du composant Link (mode compact, ligne ~119) :**

```typescript
<Link
  key={item.id}
  href={item.href}
  onClick={() => handleClick(item.id, hasSecondary)}  // ← AJOUT
  onMouseEnter={() => handleMouseEnter(item.id, hasSecondary)}
  onMouseLeave={handleMouseLeave}
  className={cn(/* ... */)}
>
```

**Mise à jour du lien Settings (mode compact, ligne ~156) :**

```typescript
<Link
  href="/settings"
  onClick={() => handleClick('settings', false)}  // ← AJOUT
  className={cn(/* ... */)}
>
```

### Modification 2 : Import de `setActivePrimaryItem`

**Ligne 46, main-sidebar.tsx :**

```typescript
const { isCompactMode, showSecondary, activePrimaryItem, setActivePrimaryItem } = useNav();
```

---

## Fichiers modifiés

- `components/navigation/main-sidebar.tsx`

**Aucune autre modification nécessaire.**

---

## Tests manuels requis

### Scénario 1 : Navigation Wiki → Settings
1. Passer en mode compact (< 1760px)
2. Cliquer sur "Wiki"
3. Vérifier que Wiki est sélectionné
4. Cliquer sur "Settings"
5. ✅ Vérifier que SEUL Settings est sélectionné

### Scénario 2 : Navigation Spaces → Home
1. Cliquer sur "Spaces"
2. Vérifier que Spaces est sélectionné
3. Cliquer sur "Home"
4. ✅ Vérifier que SEUL Home est sélectionné

### Scénario 3 : Hover après correction
1. Cliquer sur "Home"
2. Survoler "Wiki" (sans cliquer)
3. ✅ Vérifier que le menu secondaire s'affiche
4. ✅ Vérifier que Home reste sélectionné (pas Wiki)

### Scénario 4 : Mode comfort (non-régression)
1. Passer en mode comfort (>= 1760px)
2. Naviguer entre les onglets
3. ✅ Vérifier que le comportement est inchangé

---

## Risques techniques

### Risque faible

- **Impact limité** : modification isolée dans un seul composant
- **Pas de migration DB**
- **Pas de changement d'API**
- **Compatibilité** : utilise des APIs React existantes (useCallback)

### Points d'attention

- Vérifier que le hover continue de fonctionner correctement
- S'assurer que le menu secondaire pinned reste fonctionnel
- Tester sur différentes tailles d'écran autour du breakpoint (1760px)

---

## Déploiement

### Checklist pré-déploiement

1. `pnpm build` → doit passer ✅
2. Test manuel des 4 scénarios ci-dessus
3. Vérification visuelle sur mobile/tablet/desktop

### Rollback

En cas de problème, rollback simple via git :
- Aucune migration DB
- Aucun changement de state persisté
- Simple revert du commit

---

## Impact performance

**Aucun impact** :
- Ajout d'un seul callback
- Pas de re-render supplémentaire
- Logique conditionnelle légère

---

## Alternatives considérées

### Alternative 1 : Réinitialiser sur changement de pathname

**Approche :** Ajouter un `useEffect` qui reset `activePrimaryItem` quand le pathname change.

**Rejetée car :**
- Moins précis (affecte tous les changements de pathname)
- Peut créer des conflits avec le hover
- Plus complexe à maintenir

### Alternative 2 : Supprimer complètement `activePrimaryItem`

**Approche :** Utiliser uniquement `isActive(href)` pour la sélection visuelle.

**Rejetée car :**
- Casse le comportement du menu secondaire en hover
- Refacto trop large pour un simple bugfix
- Hors scope de la V1
