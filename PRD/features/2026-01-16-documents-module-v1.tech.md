# Plan Technique – Module Documents V1

## Dépendances

```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link @tiptap/pm
```

---

## Modèle Prisma

### Nouveaux modèles

```prisma
model DocFolder {
  id        String      @id @default(uuid())
  tenantId  String?     // null = Wiki agence
  parentId  String?     // null = racine
  name      String
  sortOrder Int         @default(0)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  tenant    Tenant?     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  parent    DocFolder?  @relation("FolderTree", fields: [parentId], references: [id], onDelete: Cascade)
  children  DocFolder[] @relation("FolderTree")
  documents Document[]

  @@index([tenantId, parentId])
}

model Document {
  id           String            @id @default(uuid())
  tenantId     String?           // null = Wiki agence
  folderId     String?
  title        String
  content      Json              // ProseMirror JSON (source of truth)
  isPublic     Boolean           @default(false)
  publicToken  String?           @unique
  createdById  String
  updatedById  String
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  tenant       Tenant?           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  folder       DocFolder?        @relation(fields: [folderId], references: [id], onDelete: SetNull)
  createdBy    User              @relation("docs_created", fields: [createdById], references: [id])
  updatedBy    User              @relation("docs_updated", fields: [updatedById], references: [id])
  versions     DocumentVersion[]

  @@index([tenantId, folderId])
  @@index([publicToken])
}

model DocumentVersion {
  id          String   @id @default(uuid())
  documentId  String
  title       String
  content     Json     // ProseMirror JSON snapshot
  createdById String
  createdAt   DateTime @default(now())

  document  Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  createdBy User     @relation("doc_versions_created", fields: [createdById], references: [id])

  @@index([documentId, createdAt])
}
```

### Relations User à ajouter

```prisma
model User {
  // ... existing fields
  docsCreated         Document[]        @relation("docs_created")
  docsUpdated         Document[]        @relation("docs_updated")
  docVersionsCreated  DocumentVersion[] @relation("doc_versions_created")
}
```

### Relations Tenant à ajouter

```prisma
model Tenant {
  // ... existing fields
  docFolders  DocFolder[]
  documents   Document[]
}
```

---

## Migration

```bash
pnpm prisma migrate dev --name add_documents_module
```

Impact : 3 nouvelles tables, pas de modification destructive.

---

## Routes

### Wiki agence

| Route | Fichier | Description |
|-------|---------|-------------|
| `/wiki` | `app/(dashboard)/wiki/page.tsx` | Liste arborescente |
| `/wiki/[docId]` | `app/(dashboard)/wiki/[docId]/page.tsx` | Vue document |
| `/wiki/[docId]/edit` | `app/(dashboard)/wiki/[docId]/edit/page.tsx` | Édition |

### Documents client

| Route | Fichier | Description |
|-------|---------|-------------|
| `/spaces/[id]/docs` | `app/(dashboard)/spaces/[id]/docs/page.tsx` | Liste arborescente |
| `/spaces/[id]/docs/[docId]` | `app/(dashboard)/spaces/[id]/docs/[docId]/page.tsx` | Vue document |
| `/spaces/[id]/docs/[docId]/edit` | `app/(dashboard)/spaces/[id]/docs/[docId]/edit/page.tsx` | Édition |

### Partage public

| Route | Fichier | Description |
|-------|---------|-------------|
| `/share/doc/[token]` | `app/share/doc/[token]/page.tsx` | Vue publique (pas de layout dashboard) |

---

## Composants

### `components/docs/doc-tree.tsx`

Navigation arborescente avec :
- Liste récursive dossiers/documents
- Icônes folder/file
- État expanded/collapsed
- Actions inline (créer, renommer, supprimer)

Props:
```typescript
interface DocTreeProps {
  tenantId: string | null;  // null = wiki
  folders: FolderWithChildren[];
  documents: DocumentSummary[];
  currentDocId?: string;
  basePath: string;  // "/wiki" ou "/spaces/[id]/docs"
}
```

### `components/docs/doc-editor.tsx`

Éditeur TipTap avec :
- Toolbar (H1, H2, bold, italic, list, link)
- Placeholder "Commencez à écrire..."
- Indicateur dirty state
- Bouton Sauvegarder

Props:
```typescript
import type { JSONContent } from '@tiptap/react';

interface DocEditorProps {
  initialContent: JSONContent;  // ProseMirror JSON
  onSave: (content: JSONContent) => Promise<void>;
  readOnly?: boolean;
}
```

Note: Le HTML est généré uniquement au rendu (via `editor.getHTML()` ou composant de rendu). La source de vérité reste le JSON ProseMirror.

### `components/docs/doc-viewer.tsx`

Affichage lecture seule :
- Rendu HTML sécurisé (sanitize)
- Styles prose pour le contenu

### `components/docs/version-history.tsx`

Panel latéral ou modal :
- Liste des 5 dernières versions
- Date + auteur
- Bouton "Restaurer"

---

## Server Actions

Fichier : `lib/actions/documents.ts`

```typescript
'use server'

// Folders
export async function createFolder(tenantId: string | null, parentId: string | null, name: string)
export async function renameFolder(folderId: string, name: string)
export async function deleteFolder(folderId: string)
export async function moveFolder(folderId: string, newParentId: string | null)

// Documents
export async function createDocument(tenantId: string | null, folderId: string | null, title: string)
export async function updateDocument(docId: string, title: string, content: JSONContent)
export async function deleteDocument(docId: string)
export async function moveDocument(docId: string, folderId: string | null)

// Versioning
export async function getDocumentVersions(docId: string): Promise<DocumentVersion[]>
export async function restoreVersion(versionId: string)

// Sharing
export async function togglePublicShare(docId: string, enabled: boolean)

// Inbox notification
export async function notifyDocumentUpdate(docId: string)
```

### Logique versioning

Dans `updateDocument`:
1. Créer une `DocumentVersion` avec le contenu actuel
2. Mettre à jour le `Document`
3. Supprimer les versions > 5 (FIFO)

```typescript
// Pseudo-code
const existingVersions = await prisma.documentVersion.count({ where: { documentId } });
if (existingVersions >= 5) {
  const oldest = await prisma.documentVersion.findFirst({
    where: { documentId },
    orderBy: { createdAt: 'asc' }
  });
  if (oldest) await prisma.documentVersion.delete({ where: { id: oldest.id } });
}
await prisma.documentVersion.create({ data: { documentId, title, content, createdById } });
```

---

## Module Gating

Dans chaque page `/spaces/[id]/docs/*`:

```typescript
const moduleEnabled = await hasModule(spaceId, 'docs');
if (!moduleEnabled) {
  redirect(`/spaces/${spaceId}/overview`);
}
```

---

## Inbox Integration

Helper dans `lib/actions/documents.ts`:

```typescript
async function createDocInboxItem(
  spaceId: string,
  docId: string,
  title: string,
  action: 'created' | 'deleted' | 'restored' | 'shared' | 'notified'
) {
  const titles = {
    created: `Document créé : ${title}`,
    deleted: `Document supprimé : ${title}`,
    restored: `Version restaurée : ${title}`,
    shared: `Document partagé : ${title}`,
    notified: `Document mis à jour : ${title}`  // Action volontaire via bouton "Notifier"
  };

  // Chaque événement = un InboxItem distinct (pas d'upsert)
  // entityKey unique par événement pour éviter les doublons involontaires
  const eventKey = `doc:${docId}:${action}:${Date.now()}`;

  await prisma.inboxItem.create({
    data: {
      spaceId,
      actorType: 'agency',
      type: 'signal',
      title: titles[action],
      actionUrl: `/spaces/${spaceId}/docs/${docId}`,
      entityKey: eventKey,
      status: 'unread'
    }
  });
}
```

**Règles Inbox :**
- `created` : lors de la création d'un document dans un espace client
- `deleted` : lors de la suppression d'un document
- `restored` : lors de la restauration d'une version
- `shared` : lors de l'activation du partage public
- `notified` : action volontaire via bouton "Notifier le client"

⚠️ **Jamais d'InboxItem sur une édition normale.** Seule l'action "Notifier" déclenche une notification de mise à jour.

---

## Navigation Updates

### Sidebar agence

Ajouter lien "Wiki" pour les rôles agence :

```tsx
{isAgencyRole && (
  <Link href="/wiki">
    <FileText className="h-4 w-4" />
    Wiki
  </Link>
)}
```

### Navigation espace

Ajouter lien "Documents" si module actif :

```tsx
{hasDocsModule && (
  <Link href={`/spaces/${spaceId}/docs`}>
    <FileText className="h-4 w-4" />
    Documents
  </Link>
)}
```

---

## Sécurité

1. **Sanitize HTML** : utiliser DOMPurify ou similaire pour le rendu
2. **Token public** : générer avec `crypto.randomUUID()`, non devinable
3. **RBAC** : vérifier permissions dans chaque server action
4. **XSS** : TipTap produit du HTML sûr, mais sanitize au rendu

---

## Tests

### Unit tests
- `createFolder` crée bien un dossier
- `updateDocument` crée une version
- Versioning FIFO (max 5)

### Integration tests
- Création document → visible dans l'arborescence
- Partage public → accessible via token
- Module OFF → redirect

---

## Risques techniques

| Risque | Mitigation |
|--------|------------|
| Conflit d'édition (2 users) | V1 accepte : dernier save gagne. V2 = temps réel |
| Performance arbre profond | Profondeur max 3 niveaux (vérifiée côté serveur) |
| Taille contenu | Pas de limite V1, monitorer |

### Règle de profondeur (3 niveaux max)

Vérification dans `createFolder` et `moveFolder` :

```typescript
async function getDepth(folderId: string | null): Promise<number> {
  if (!folderId) return 0;
  const folder = await prisma.docFolder.findUnique({
    where: { id: folderId },
    select: { parentId: true }
  });
  if (!folder) return 0;
  return 1 + await getDepth(folder.parentId);
}

// Dans createFolder
const parentDepth = await getDepth(parentId);
if (parentDepth >= 2) {
  throw new Error('MAX_DEPTH_REACHED'); // 3 niveaux max (0, 1, 2)
}
```

---

## Checklist implémentation

1. [ ] Migration Prisma
2. [ ] Server actions documents
3. [ ] Composant DocTree
4. [ ] Composant DocEditor (TipTap)
5. [ ] Pages Wiki
6. [ ] Pages Docs client
7. [ ] Page partage public
8. [ ] Navigation sidebar/espace
9. [ ] Intégration Inbox
10. [ ] Tests
11. [ ] Build OK
