# PRD – Documents

## Objectif
Centraliser la documentation liée à l’agence et aux clients
(briefs, process, décisions, bases de connaissance),
avec une expérience d’édition moderne, collaborative
et sécurisée (inspirée Notion / Outline).

---

## Utilisateurs concernés
- Agence : création, édition, organisation
- Client : accès lecture uniquement (si partagé)

---

## Types d’espaces documents
- **Wiki agence**
  - Interne uniquement
  - Process, méthodes, standards, onboarding
  - Jamais visible par les clients

- **Documents client**
  - Liés à un espace client
  - Visibilité contrôlée par l’agence
  - Certains documents peuvent être partagés au client

---

## Cas d’usage principaux
- Rédiger un brief à plusieurs
- Construire une stratégie en équipe
- Mettre à jour un process interne
- Partager un document lisible au client
- Revenir sur une version précédente après une erreur

---

## Ce que l’utilisateur peut faire
- Créer dossiers et sous-dossiers
- Créer des pages
- Éditer un document à plusieurs en temps réel
- Voir qui est en train d’éditer
- Voir les modifications apparaître en direct
- Consulter l’historique des versions
- Restaurer une version précédente
- Continuer à éditer après restauration
- Partager un document en lecture seule

---

## Ce que l’utilisateur NE PEUT PAS faire
- Pas de permissions par paragraphe (V1)
- Pas de publication publique indexable
- Pas de comparaison visuelle avancée entre versions (V1)

---

## Collaboration temps réel (Option C progressive)

### Édition temps réel
- Plusieurs utilisateurs peuvent éditer simultanément
- Les modifications sont synchronisées en temps réel
- Les conflits sont gérés automatiquement
- Les utilisateurs voient la présence des autres

### Auto-update
- Les changements apparaissent instantanément chez tous
- Aucune action “sauvegarder” manuelle nécessaire
- Le document est toujours dans un état cohérent

---

## Historique & versions

### Principe
- Le document est versionné par **snapshots**
- Un snapshot représente un état stable du document
- Le temps réel continue indépendamment de l’historique

### Règles V1
- Conservation des **5 dernières versions**
- Chaque version contient :
  - date
  - auteur principal
- Restaurer une version :
  - recharge l’état correspondant
  - crée une nouvelle version
  - ne casse pas la collaboration temps réel

> Objectif : sécurité et confiance, pas un Git.

---

## Partage public
- Désactivé par défaut
- Activable uniquement par l’agence
- Lecture seule
- Lien non indexable
- Révocable à tout moment

---

## UX attendue
- Navigation arborescente toujours visible
- Édition fluide sans latence perceptible
- Indication claire de présence des autres utilisateurs
- Création d’une page en moins de 10 secondes
- Aucun écran vide sans call-to-action

---

## Règles UX clés
- Le temps réel doit être invisible (ça “juste marche”)
- L’historique ne doit jamais bloquer l’édition
- Restaurer une version doit être sans risque

---

## Hors scope (volontairement)
- Permissions fines par bloc
- Versioning illimité
- Audit juridique exhaustif par caractère
