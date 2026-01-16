# PRD – Module Documents V1

## Contexte

L'agence a besoin de centraliser la documentation :
- **Wiki interne** : process, méthodes, onboarding (jamais visible par les clients)
- **Documents client** : briefs, stratégies, décisions (visibilité contrôlée)

Actuellement, cette documentation est dispersée (Drive, Notion, emails).
Le module Documents doit offrir une expérience d'édition moderne et sécurisée.

---

## Objectif

Permettre à l'agence de :
- Créer et organiser des documents en arborescence (dossiers/pages)
- Éditer avec un éditeur WYSIWYG (type Notion)
- Versionner automatiquement les modifications
- Partager certains documents en lecture seule aux clients

---

## Scope

### Inclus (V1)

- **Wiki agence** (interne uniquement)
  - Arborescence dossiers/documents
  - Édition WYSIWYG (TipTap)
  - Versioning automatique (5 dernières versions)
  - Restauration de version

- **Documents client** (par espace)
  - Même fonctionnalités que le wiki
  - Partage en lecture seule (lien non indexable)
  - Intégration Inbox pour événements métier

- **Éditeur TipTap**
  - Mise en forme basique (titres, gras, italique, listes)
  - Liens
  - Sauvegarde manuelle (pas de temps réel)

- **Versioning**
  - Snapshot créé uniquement sur sauvegarde explicite (bouton "Sauvegarder")
  - Conservation des 5 dernières versions
  - Restauration sans perte

### Exclu (V1)

- Édition collaborative temps réel (Yjs)
- Permissions par paragraphe/bloc
- Comparaison visuelle entre versions
- Commentaires sur documents
- Import/export (Word, PDF)
- Images/médias intégrés
- Recherche full-text

---

## UX / Comportement attendu

### Navigation

- Sidebar avec arborescence toujours visible
- Création dossier/document en 1 clic
- Drag & drop pour réorganiser (V2)

### Édition

- Ouverture immédiate du document
- Éditeur WYSIWYG fluide
- Bouton "Sauvegarder" explicite
- Indication "Modifications non sauvegardées" si dirty

### Versioning

- Accès historique via bouton discret
- Liste des 5 dernières versions (date + auteur)
- Restaurer = charge le contenu, permet de continuer à éditer

### Partage (documents client)

- Toggle "Partager au client" (OFF par défaut)
- Génération d'un lien unique non indexable
- Révocable à tout moment
- Vue publique en lecture seule (pas de login requis)

### États vides

- Wiki vide : "Aucun document. Créez votre premier document."
- Dossier vide : "Ce dossier est vide."
- Historique vide : "Pas encore de versions."

### Permissions

| Rôle | Wiki agence | Docs client (espace) |
|------|-------------|---------------------|
| agency_admin | Tout | Tout |
| agency_manager | Tout | Tout |
| agency_production | Lecture + édition | Lecture + édition |
| client_admin | Aucun accès | Lecture (si partagé) |
| client_user | Aucun accès | Lecture (si partagé) |

---

## Règles métier

1. **tenantId null = Wiki agence** (documents internes)
2. **tenantId défini = Documents client** (liés à un espace)
3. **Module gating** : accès aux docs client uniquement si module `docs` activé sur l'espace
4. **Versioning** : snapshot créé uniquement sur action "Sauvegarder" explicite, max 5 conservées (FIFO)
5. **Partage public** : token unique, non devinable, révocable. Toujours régénéré à chaque activation (jamais réutilisé).
6. **Suppression** : soft delete non implémenté V1 (suppression définitive)
7. **Profondeur arborescence** : maximum 3 niveaux (racine → dossier → sous-dossier). Pas de création au-delà.

---

## Intégration Inbox

Créer un InboxItem pour :

| Événement | actorType | type | Condition |
|-----------|-----------|------|-----------|
| Création document | agency | signal | Espace client uniquement |
| Suppression document | agency | signal | Espace client uniquement |
| Restauration version | agency | signal | Espace client uniquement |
| Partage au client | agency | signal | Toggle ON |
| Notification manuelle | agency | signal | Bouton "Notifier" cliqué |

⚠️ **Jamais d'InboxItem sur une édition normale.** Seule l'action "Notifier" permet de signaler une mise à jour au client.

Chaque événement crée un InboxItem distinct (pas de fusion/écrasement).

---

## Critères d'acceptation

### Wiki agence
- [ ] Je peux créer un dossier à la racine
- [ ] Je peux créer un sous-dossier
- [ ] Je peux créer un document dans un dossier
- [ ] Je peux éditer un document avec TipTap
- [ ] Je peux sauvegarder et voir "Sauvegardé"
- [ ] Je peux voir l'historique des versions
- [ ] Je peux restaurer une version précédente
- [ ] Un client ne voit jamais le wiki

### Documents client
- [ ] Je peux créer des documents dans un espace client
- [ ] Je peux activer le partage public
- [ ] Le lien public fonctionne sans login
- [ ] Je peux révoquer le partage
- [ ] Un InboxItem est créé quand je partage

### Module gating
- [ ] Si module `docs` OFF, la route redirige vers overview
- [ ] Le menu "Documents" n'apparaît pas si module OFF

---

## Limites / Dette assumée

- **Pas de temps réel** : sauvegarde manuelle, conflits possibles si 2 users éditent
- **Pas de médias** : texte uniquement dans TipTap V1
- **Pas de recherche** : navigation arborescente uniquement
- **5 versions max** : les anciennes sont supprimées définitivement
- **Suppression définitive** : pas de corbeille

---

## Plan d'évolution (V2+)

1. Édition collaborative temps réel (Yjs + Liveblocks)
2. Images et médias intégrés
3. Recherche full-text
4. Commentaires sur documents
5. Templates de documents
6. Export PDF
