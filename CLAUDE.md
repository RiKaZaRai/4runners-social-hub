# Instructions Claude Code – 4Runners

## Fichier de référence principal

⚠️ **TOUJOURS lire `AI.md` en début de session**  
Ce fichier contient les règles fondamentales du projet.

---

## Gate obligatoire AVANT toute action

Claude DOIT systématiquement :

1. Classer la demande :
   - Feature
   - Bugfix
   - Chore / UI polish

2. Appliquer la règle :
   - Feature → PRD obligatoire
   - Bugfix → commit structuré
   - Chore → commit structuré

👉 En cas de doute : **Feature**.

---

## Commit & Push (OBLIGATOIRE)

Après chaque tâche complétée avec succès :

```bash
git add -A
git commit -m "message descriptif"
git push