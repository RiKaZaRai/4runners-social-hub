# PRD – Uniformisation du hover de navigation

**Date :** 2026-01-18
**Slug :** navigation-hover-uniformisation

---

## Contexte

Actuellement, le comportement de hover est incohérent entre les différents onglets de navigation :

1. **Home, Inbox, Settings** : hover simple avec bordure et background qui disparaît au mouseLeave
2. **Spaces, Wiki** : hover qui active `activePrimaryItem`, ce qui rend l'onglet bleu en permanence même après avoir quitté le survol

Le problème : `activePrimaryItem` est utilisé à la fois pour :
- Gérer l'affichage du menu secondaire
- Gérer le style visuel de l'onglet

Cela crée une confusion visuelle où Wiki/Spaces restent bleus après survol.

---

## Objectif

Uniformiser le comportement de hover sur tous les onglets de navigation pour qu'ils aient tous le même effet visuel temporaire.

---

## Scope

### Inclus
- Séparer la logique de gestion du menu secondaire du style visuel
- Utiliser uniquement le CSS `:hover` pour l'effet visuel de survol
- Conserver `activePrimaryItem` uniquement pour déterminer quel menu secondaire afficher
- Retirer `isHovered` de la condition de style actif

### Exclu
- Modification du comportement du menu secondaire (pinned, etc.)
- Changement du style visuel lui-même
- Refonte complète du système de navigation

---

## UX / Comportement attendu

### Parcours utilisateur

**Comportement actuel (problème) :**
1. Utilisateur en mode compact (< 1760px)
2. Survole "Wiki" → Wiki devient bleu ET reste bleu
3. Survole "Home" → Home a un hover différent, Wiki reste bleu
4. Clique ailleurs → Wiki reste parfois bleu

**Comportement attendu après correction :**
1. Utilisateur en mode compact (< 1760px)
2. Survole "Wiki" → Wiki a un hover identique aux autres onglets
3. Quitte le survol → le hover disparaît immédiatement
4. Le menu secondaire s'affiche toujours après 120ms de hover (comportement inchangé)
5. Tous les onglets (Home, Inbox, Spaces, Wiki, Settings) ont le même effet de hover

### États visuels

**État actif** (page courante uniquement) :
- Border primary/30
- Background primary/10
- Icône et texte primary
- Indicateur dot (mode comfort)
- Déterminé par `isActive(item.href)` basé sur pathname

**État hover** (survol - TOUS les onglets) :
- Border border/60
- Background muted/50
- Appliqué via `:hover` CSS uniquement
- Disparaît immédiatement au mouseLeave

**État actif + hover** :
- Garde le style actif (pas de changement au survol)

---

## Règles métier

1. `activePrimaryItem` ne doit JAMAIS affecter le style visuel des onglets
2. `activePrimaryItem` sert UNIQUEMENT à déterminer quel menu secondaire afficher
3. Le style visuel est déterminé UNIQUEMENT par :
   - `isActive(href)` pour l'état actif (basé sur pathname)
   - `:hover` CSS pour le survol temporaire
4. Tous les onglets doivent avoir le même comportement de hover, qu'ils aient ou non un menu secondaire

---

## Critères d'acceptation

- [ ] Tous les onglets (Home, Inbox, Spaces, Wiki, Settings) ont le même effet de hover
- [ ] Le hover disparaît complètement au mouseLeave
- [ ] Seul l'onglet correspondant au pathname actuel a l'état "actif" permanent
- [ ] Le menu secondaire s'affiche toujours au survol de Spaces/Wiki après 120ms
- [ ] Le menu secondaire peut être pinned (comportement inchangé)
- [ ] Aucun onglet ne reste bleu après avoir quitté le survol
- [ ] Mode comfort : comportement inchangé

---

## Limites / Dette assumée

- Le délai de 120ms pour afficher le menu secondaire est conservé
- `activePrimaryItem` reste dans le contexte car nécessaire pour le menu secondaire
- Pas de refactorisation globale du système de navigation

---

## Plan d'évolution

Aucun plan d'évolution prévu. Cette correction finalise le comportement de navigation.
