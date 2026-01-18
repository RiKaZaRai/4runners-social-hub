# PRD – Affichage global du menu secondaire au hover

**Date :** 2026-01-18
**Slug :** secondary-menu-global-hover

---

## Contexte

Actuellement, le menu secondaire wiki ne s'affiche au hover que si l'utilisateur est déjà sur une page wiki. Cela crée une expérience incohérente :

- Depuis Home → hover sur Wiki → ❌ pas de menu secondaire
- Depuis Wiki → hover sur Wiki → ✅ menu secondaire s'affiche

Le problème architectural : le menu secondaire est rendu **dans** la page wiki (via `WikiStructured`), donc il n'existe pas quand on est sur d'autres pages.

---

## Objectif

Permettre l'affichage du menu secondaire au hover sur les onglets concernés (Wiki, Spaces...) **depuis n'importe quelle page**, pour offrir une expérience de navigation cohérente.

---

## Scope

### Inclus
- Déplacement du rendu du menu secondaire wiki vers un niveau global (DashboardShell)
- Affichage conditionnel basé sur `activePrimaryItem` du contexte de navigation
- Support pour les futurs menus secondaires (Spaces, etc.)
- Chargement des données wiki nécessaires au niveau global
- Maintien du comportement de pin/unpin
- Gestion du hover et de la fermeture automatique

### Exclu
- Implémentation du menu secondaire Spaces (à faire plus tard)
- Modification du contenu ou du style du menu secondaire wiki
- Refonte de l'architecture de navigation complète
- Optimisation avancée du chargement des données (SSR, cache, etc.)

---

## UX / Comportement attendu

### Parcours utilisateur

**Scénario 1 : Hover depuis n'importe quelle page**
1. Utilisateur sur Home (ou Settings, Inbox, etc.)
2. Mode compact (< 1760px)
3. Survole l'onglet "Wiki" dans le menu principal
4. Après 120ms → ✅ Menu secondaire wiki s'affiche
5. Quitte le survol → Menu se cache après 150ms (si non-pinned)

**Scénario 2 : Navigation depuis le menu secondaire**
1. Utilisateur sur Home
2. Survole Wiki → menu secondaire s'affiche
3. Clique sur un document dans le menu secondaire
4. ✅ Navigation vers la page wiki du document
5. Menu secondaire reste affiché (déjà sur wiki)

**Scénario 3 : Pin/Unpin**
1. Utilisateur sur Home
2. Survole Wiki → menu secondaire s'affiche
3. Clique sur l'icône "pin"
4. ✅ Menu reste affiché même si on quitte le survol
5. Peut naviguer librement, menu reste visible
6. Clique sur "unpin" → menu se cache

**Scénario 4 : Mode comfort**
1. Mode >= 1760px
2. Le menu secondaire reste toujours visible quand on est sur wiki
3. Pas de hover depuis d'autres pages (comportement inchangé)

### États visuels

Aucun changement visuel. Les états restent les mêmes :
- Menu secondaire avec même style
- Bouton pin/unpin identique
- Transitions identiques

### Permissions et visibilité

- Clients ne voient pas l'onglet Wiki (comportement existant)
- Pas de changement de permissions

---

## Règles métier

1. Le menu secondaire s'affiche au hover sur un onglet qui a `hasSecondary: true`
2. Le menu secondaire affiche le contenu correspondant à `activePrimaryItem` :
   - `activePrimaryItem === 'wiki'` → WikiSidebar
   - `activePrimaryItem === 'spaces'` → (futur) SpacesSidebar
   - `activePrimaryItem === null` → rien
3. En mode compact uniquement (< 1760px)
4. Le menu doit se fermer quand :
   - L'utilisateur quitte le survol (après 150ms) ET menu non-pinned
   - L'utilisateur clique sur un onglet sans menu secondaire (Home, Inbox, Settings)
   - L'utilisateur clique en dehors du menu
5. Les données du menu secondaire doivent être chargées au niveau global pour être disponibles à tout moment

---

## Critères d'acceptation

- [ ] Depuis Home, hover sur Wiki affiche le menu secondaire wiki
- [ ] Depuis Settings, hover sur Wiki affiche le menu secondaire wiki
- [ ] Depuis Inbox, hover sur Wiki affiche le menu secondaire wiki
- [ ] Le menu secondaire affiche les mêmes données que quand on est sur wiki
- [ ] Le pin/unpin fonctionne depuis n'importe quelle page
- [ ] La navigation depuis le menu secondaire fonctionne
- [ ] Le menu se cache correctement au mouseLeave (si non-pinned)
- [ ] Le menu se cache quand on clique sur Home/Inbox/Settings
- [ ] Mode comfort : pas de régression
- [ ] Performance : pas de ralentissement notable au chargement

---

## Limites / Dette assumée

- **Chargement des données wiki** : les données du menu wiki seront chargées au niveau global (dans le layout principal), même si l'utilisateur ne va jamais sur wiki
  - Impact performance acceptable (requête Prisma simple)
  - Alternative (SSR/cache) jugée sur-ingénierie pour V1
- **Pas de lazy loading** : pas de chargement à la demande au hover
- **Pas de pré-fetch** : pas d'optimisation de cache avancée
- Le menu secondaire Spaces n'est pas implémenté (prévu plus tard)

---

## Plan d'évolution

### V2 potentielle (si nécessaire)
- Lazy loading des données au hover
- Cache côté client pour éviter rechargement
- Support du menu secondaire Spaces
- Optimisation SSR/RSC pour les données du menu

### Migration future
Si d'autres sections ont besoin d'un menu secondaire :
1. Ajouter `hasSecondary: true` dans menuItems
2. Créer le composant Sidebar correspondant
3. L'ajouter dans le switch/case du GlobalSecondarySidebar
4. Charger les données dans le layout principal
