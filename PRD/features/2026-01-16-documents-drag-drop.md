# PRD – Documents : Drag & Drop

## Contexte

Le module Documents V1 permet de créer des dossiers et documents, mais il n'est pas possible de les déplacer après création. Si l'utilisateur se trompe de dossier, il doit supprimer et recréer.

## Objectif

Permettre de déplacer un document ou un dossier vers un autre dossier via drag & drop dans l'arborescence.

## Scope

### Inclus
- Drag & drop de documents vers un dossier
- Drag & drop de documents vers la racine
- Drag & drop de dossiers vers un autre dossier (respect de la limite 3 niveaux)
- Drag & drop de dossiers vers la racine
- Feedback visuel pendant le drag (zone de drop highlight)

### Exclu
- Réorganisation de l'ordre des éléments (sortOrder) - V2
- Multi-sélection pour déplacer plusieurs éléments - V2

## UX / Comportement attendu

1. L'utilisateur clique et maintient sur un document/dossier
2. Il le fait glisser vers un dossier cible (ou la racine)
3. Le dossier cible s'illumine pour indiquer qu'il peut recevoir l'élément
4. Au relâchement, l'élément est déplacé
5. L'arborescence se met à jour instantanément

### Contraintes
- Un dossier ne peut pas être déplacé dans un de ses enfants (boucle)
- La profondeur max reste 3 niveaux (bloquer si dépassement)

### États d'erreur
- Si la profondeur max est atteinte : l'élément revient à sa position initiale (pas de message d'erreur intrusif)

## Règles métier

1. `moveDocument(docId, folderId)` - déjà implémenté
2. `moveFolder(folderId, newParentId)` - déjà implémenté avec check profondeur
3. Pas de création d'InboxItem pour un déplacement (action interne)

## Critères d'acceptation

- [ ] Je peux drag un document vers un dossier
- [ ] Je peux drag un document vers la racine
- [ ] Je peux drag un dossier vers un autre dossier
- [ ] Je peux drag un dossier vers la racine
- [ ] La limite de 3 niveaux est respectée
- [ ] Le feedback visuel est clair

## Limites / Dette assumée

- Pas de librairie externe (HTML5 drag & drop natif)
- Pas d'animation fluide (transition simple)
