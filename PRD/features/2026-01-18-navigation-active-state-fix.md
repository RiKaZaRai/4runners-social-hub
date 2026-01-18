# PRD – Fix Navigation Active State

**Date :** 2026-01-18
**Slug :** navigation-active-state-fix

---

## Contexte

Actuellement, en mode compact (< 1760px), lorsqu'un utilisateur :
1. Clique sur un onglet avec menu secondaire (ex: Wiki)
2. Puis clique sur un onglet sans menu secondaire (ex: Settings)

L'onglet précédent (Wiki) reste visuellement sélectionné même si l'utilisateur est bien redirigé vers la nouvelle page (Settings).

Ce bug est causé par le fait que `activePrimaryItem` dans le contexte de navigation n'est jamais réinitialisé quand on clique sur un onglet qui n'a pas de menu secondaire.

---

## Objectif

Corriger le comportement de sélection visuelle des onglets de navigation pour que seul l'onglet correspondant à la page actuelle soit mis en surbrillance.

---

## Scope

### Inclus
- Réinitialisation de `activePrimaryItem` à `null` lors du clic sur un onglet sans menu secondaire
- Correction du comportement en mode compact uniquement (le mode comfort n'est pas affecté)
- Maintien du comportement de hover pour afficher le menu secondaire

### Exclu
- Refonte complète du système de navigation
- Modification du comportement en mode comfort
- Ajout de nouvelles fonctionnalités de navigation

---

## UX / Comportement attendu

### Parcours utilisateur

**Scénario de reproduction actuel (bug) :**
1. L'utilisateur est en mode compact (< 1760px)
2. Il clique sur "Wiki" → Wiki est sélectionné visuellement ✅
3. Il clique sur "Settings" → Settings est sélectionné ET Wiki reste sélectionné ❌

**Comportement attendu après correction :**
1. L'utilisateur est en mode compact (< 1760px)
2. Il clique sur "Wiki" → Wiki est sélectionné visuellement ✅
3. Il clique sur "Settings" → SEUL Settings est sélectionné visuellement ✅
4. Si l'utilisateur survole "Wiki" → Wiki affiche un état de hover (pas d'état actif permanent)

### États visuels

**État actif** (page courante) :
- Border primary
- Background primary/10
- Icône et texte en couleur primary
- Déterminé par `isActive(item.href)` qui vérifie le pathname

**État hover** (survol pour menu secondaire) :
- Border primary (temporaire pendant le survol)
- Background primary/10 (temporaire)
- Doit disparaître après le clic si l'onglet n'a pas de menu secondaire

### Permissions et visibilité

Aucun changement de permissions. Le bug affecte tous les utilisateurs en mode compact.

---

## Règles métier

1. **En mode compact**, seul l'onglet correspondant au pathname actuel doit avoir l'état visuel "actif"
2. Le `activePrimaryItem` doit être `null` pour les onglets sans menu secondaire (Home, Inbox, Settings)
3. Le `activePrimaryItem` peut contenir une valeur (`'wiki'`, `'spaces'`) uniquement pour les onglets avec menu secondaire ET uniquement pendant le hover
4. L'état actif basé sur le pathname (`isActive()`) a la priorité sur `activePrimaryItem` pour l'affichage visuel

---

## Critères d'acceptation

- [ ] Quand on clique sur Settings depuis Wiki, seul Settings est visuellement actif
- [ ] Quand on clique sur Home depuis Wiki, seul Home est visuellement actif
- [ ] Quand on clique sur Inbox depuis Spaces, seul Inbox est visuellement actif
- [ ] Le hover sur Wiki/Spaces affiche toujours le menu secondaire en mode compact
- [ ] Le comportement en mode comfort reste inchangé
- [ ] Aucune régression sur les autres fonctionnalités de navigation

---

## Limites / Dette assumée

- Ce fix corrige uniquement le bug visuel en mode compact
- Le système de `activePrimaryItem` reste en place car il est nécessaire pour la gestion du menu secondaire en mode hover
- Pas de refactorisation globale du système de navigation

---

## Plan d'évolution

Si nécessaire à l'avenir :
- Unifier la logique d'état actif entre mode compact et comfort
- Simplifier le système de gestion du menu secondaire
