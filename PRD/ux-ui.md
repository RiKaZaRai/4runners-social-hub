# PRD – UX / UI
4Runners Social Hub

## Rôle de ce document
Ce document définit les principes UX et UI transverses de l’application.

Il sert de :
- garde-fou produit
- référence unique pour toutes les features
- base d’alignement entre développement, design et décisions produit

Toute implémentation UI/UX doit respecter ce document.
En cas de conflit, le point doit être signalé AVANT implémentation.

---

## Objectif UX global

Construire un outil **agence-first**, pensé pour :
- une utilisation quotidienne
- une équipe réduite
- des décisions rapides
- un minimum de friction

Ce n’est **pas** :
- un ClickUp bis
- un Notion bis
- un Slack bis

L’outil doit faire gagner du temps, pas en consommer.

---

## Principes UX fondamentaux (non négociables)

- Moins de clics > plus de fonctionnalités
- Une action principale par écran
- Les actions fréquentes sont toujours visibles
- Pas d’écran vide sans call-to-action clair
- Pas de modale inutile
- Pas d’onboarding obligatoire pour comprendre une page
- Si une action est rare, elle peut être discrète
- Si une action est fréquente, elle doit être évidente

---

## Hiérarchie de l’information

Ordre de priorité visuelle :

1. Ce qui nécessite une action immédiate
2. Ce qui est en cours
3. Le reste (historique, information passive)

Concrètement :
- Inbox avant tout
- Actions avant contenu
- Paramètres toujours en dernier

---

## Navigation & structure

- Navigation latérale persistante
- Structure stable dans le temps (pas de menu mouvant)
- Les mêmes actions sont toujours au même endroit
- Pas de duplication inutile dans plusieurs menus
- Les sous-niveaux doivent être lisibles sans cliquer partout

---

## Densité d’information

### Vue Agence
- Dense
- Scannable
- Orientée pilotage
- Listes et tableaux préférés aux cartes

### Vue Client
- Épurée
- Rassurante
- Lecture prioritaire
- Peu d’actions possibles

Jamais la même densité entre Agence et Client.

---

## Règles UI

- UI sobre, fonctionnelle, sans décoration inutile
- Le texte prime sur l’icône quand il y a ambiguïté
- Les icônes servent à renforcer, pas à remplacer
- Pas de couleurs “gadget”
- Les états (active, disabled, blocked) doivent être évidents

---

## Feedback utilisateur

- Toute action déclenche un retour immédiat
- Les loaders longs doivent expliquer ce qui se passe
- Les erreurs doivent être compréhensibles et actionnables
- Pas de toast “succès” inutile
- Les confirmations doivent être discrètes

---

## États & statuts

- Les statuts doivent être visibles sans entrer dans le détail
- Les badges sont préférés aux textes longs
- Un statut doit toujours répondre à : “Que dois-je faire ?”

---

## Temps réel & collaboration

- Le temps réel ne doit jamais surprendre
- Les modifications des autres sont visibles mais non intrusives
- La présence des utilisateurs est claire mais discrète
- Le rollback doit être sans risque
- L’historique doit être accessible sans bloquer l’édition

---

## Différenciation Agence / Client

- L’agence voit tout
- Le client voit l’essentiel
- Les actions dangereuses sont impossibles côté client
- Pas de doute possible sur ce que le client peut ou ne peut pas faire

---

## Modules & features

- Une feature inactive ne doit jamais apparaître
- Un module OFF = pas de menu, pas de route, pas d’action
- Les paramètres sont réservés à l’agence
- Le client ne configure jamais la plateforme

---

## Anti-objectifs (volontairement exclus)

- Pas de configuration complexe
- Pas de permissions fines partout
- Pas de sur-abstraction
- Pas de personnalisation UI client
- Pas de feature “nice to have” sans usage réel

---

## Règle d’or finale

Si une feature nécessite une explication,
c’est que l’UX n’est pas assez bonne.

Si une action fréquente est cachée,
c’est que l’UI est mal pensée.
