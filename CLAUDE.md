# Instructions Claude Code

## Fichier de référence principal

**TOUJOURS lire `AI.md` en début de session** - Ce fichier contient les règles fondamentales du projet.

## Rappels critiques

### Commit et Push

Après chaque tâche complétée avec succès :
1. `git add -A`
2. `git commit -m "message descriptif"` avec `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`
3. `git push`

**Ne jamais oublier de commit et push après une modification.**

### Architecture Navigation (App Router)

- `app/(dashboard)/layout.tsx` : menu principal uniquement
- Routes avec menu secondaire : créer un layout spécifique (ex: `app/(dashboard)/wiki/layout.tsx`)
- Routes sans menu secondaire : contenu pleine largeur automatique

### Stack technique

- Next.js 16+ (App Router)
- TypeScript strict
- Prisma ORM
- Tailwind CSS + shadcn/ui
- Multi-tenant avec `tenantId`

### Commandes de validation

```bash
pnpm build    # Build obligatoire avant commit
pnpm test     # Tests si disponibles
pnpm lint     # Lint si disponible
```

### Process feature

1. Créer PRD dans `PRD/features/YYYY-MM-DD-<slug>.md`
2. Plan technique dans `PRD/features/YYYY-MM-DD-<slug>.tech.md`
3. Attendre validation
4. Implémenter
5. Build + Commit + Push
