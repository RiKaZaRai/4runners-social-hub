'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { isAgencyRole } from '@/lib/roles';
import type { Prisma } from '@prisma/client';

// Use a generic JSON type instead of importing from @tiptap/react (client module)
type EditorContent = Prisma.JsonValue;

// ============================================
// Types
// ============================================

export type FolderWithChildren = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  children: FolderWithChildren[];
};

export type DocumentSummary = {
  id: string;
  title: string;
  folderId: string | null;
  updatedAt: string;
};

export type DocumentFull = {
  id: string;
  title: string;
  folderId: string | null;
  content: Prisma.JsonValue;
  updatedAt: string;
  createdBy: {
    name: string | null;
    email: string;
  } | null;
};

// ============================================
// Helpers
// ============================================

async function getDepth(folderId: string | null): Promise<number> {
  if (!folderId) return 0;
  const folder = await prisma.docFolder.findUnique({
    where: { id: folderId },
    select: { parentId: true }
  });
  if (!folder) return 0;
  return 1 + (await getDepth(folder.parentId));
}

async function verifyDocumentAccess(docId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: { tenantId: true }
  });

  if (!doc) throw new Error('DOCUMENT_NOT_FOUND');

  // Wiki agence: agence uniquement
  if (doc.tenantId === null) {
    if (!isAgencyRole(user.role)) {
      throw new Error('ACCESS_DENIED');
    }
    return { doc, user, isWiki: true };
  }

  // Documents client: vérifier membership ou agence
  if (!isAgencyRole(user.role)) {
    const membership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: doc.tenantId, userId } }
    });
    if (!membership) throw new Error('ACCESS_DENIED');
  }

  return { doc, user, isWiki: false };
}

async function verifyFolderAccess(folderId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  const folder = await prisma.docFolder.findUnique({
    where: { id: folderId },
    select: { tenantId: true }
  });

  if (!folder) throw new Error('FOLDER_NOT_FOUND');

  if (folder.tenantId === null && !isAgencyRole(user.role)) {
    throw new Error('ACCESS_DENIED');
  }

  return { folder, user };
}

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
    notified: `Document mis à jour : ${title}`
  };

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

// ============================================
// Folder Actions
// ============================================

export async function createFolder(
  tenantId: string | null,
  parentId: string | null,
  name: string
) {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  // Wiki agence: agence uniquement
  if (tenantId === null && !isAgencyRole(user.role)) {
    throw new Error('ACCESS_DENIED');
  }

  // Vérifier profondeur (max 3 niveaux)
  const parentDepth = await getDepth(parentId);
  if (parentDepth >= 2) {
    throw new Error('MAX_DEPTH_REACHED');
  }

  const folder = await prisma.docFolder.create({
    data: {
      tenantId,
      parentId,
      name: name.trim()
    }
  });

  if (tenantId) {
    revalidatePath(`/spaces/${tenantId}/docs`);
  } else {
    revalidatePath('/wiki');
  }

  return folder;
}

export async function renameFolder(folderId: string, name: string) {
  const session = await requireSession();
  await verifyFolderAccess(folderId, session.userId);

  const folder = await prisma.docFolder.update({
    where: { id: folderId },
    data: { name: name.trim() }
  });

  if (folder.tenantId) {
    revalidatePath(`/spaces/${folder.tenantId}/docs`);
  } else {
    revalidatePath('/wiki');
  }

  return folder;
}

export async function deleteFolder(folderId: string) {
  const session = await requireSession();
  const { folder } = await verifyFolderAccess(folderId, session.userId);

  await prisma.docFolder.delete({
    where: { id: folderId }
  });

  if (folder.tenantId) {
    revalidatePath(`/spaces/${folder.tenantId}/docs`);
  } else {
    revalidatePath('/wiki');
  }

  return { success: true };
}

export async function moveFolder(folderId: string, newParentId: string | null) {
  const session = await requireSession();
  await verifyFolderAccess(folderId, session.userId);

  // Vérifier profondeur
  const parentDepth = await getDepth(newParentId);
  if (parentDepth >= 2) {
    throw new Error('MAX_DEPTH_REACHED');
  }

  const folder = await prisma.docFolder.update({
    where: { id: folderId },
    data: { parentId: newParentId }
  });

  if (folder.tenantId) {
    revalidatePath(`/spaces/${folder.tenantId}/docs`);
  } else {
    revalidatePath('/wiki');
  }

  return folder;
}

// ============================================
// Document Actions
// ============================================

export async function createDocument(
  tenantId: string | null,
  folderId: string | null,
  title: string
) {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  if (tenantId === null && !isAgencyRole(user.role)) {
    throw new Error('ACCESS_DENIED');
  }

  const emptyContent = {
    type: 'doc',
    content: [{ type: 'paragraph' }]
  };

  const doc = await prisma.document.create({
    data: {
      tenantId,
      folderId,
      title: title.trim(),
      content: emptyContent as Prisma.InputJsonValue,
      createdById: session.userId,
      updatedById: session.userId
    }
  });

  // InboxItem si espace client
  if (tenantId) {
    await createDocInboxItem(tenantId, doc.id, doc.title, 'created');
    revalidatePath(`/spaces/${tenantId}/docs`);
  } else {
    revalidatePath('/wiki');
  }

  return doc;
}

export async function updateDocument(
  docId: string,
  title: string,
  content: EditorContent
) {
  const session = await requireSession();
  const { doc } = await verifyDocumentAccess(docId, session.userId);

  // Récupérer le document actuel pour créer une version
  const currentDoc = await prisma.document.findUnique({
    where: { id: docId },
    select: { title: true, content: true, tenantId: true }
  });

  if (!currentDoc) throw new Error('DOCUMENT_NOT_FOUND');

  // Créer une version snapshot
  const versionCount = await prisma.documentVersion.count({
    where: { documentId: docId }
  });

  // Supprimer la version la plus ancienne si on a déjà 5 versions
  if (versionCount >= 5) {
    const oldest = await prisma.documentVersion.findFirst({
      where: { documentId: docId },
      orderBy: { createdAt: 'asc' }
    });
    if (oldest) {
      await prisma.documentVersion.delete({ where: { id: oldest.id } });
    }
  }

  // Créer la nouvelle version
  await prisma.documentVersion.create({
    data: {
      documentId: docId,
      title: currentDoc.title,
      content: currentDoc.content as Prisma.InputJsonValue,
      createdById: session.userId
    }
  });

  // Mettre à jour le document
  const updated = await prisma.document.update({
    where: { id: docId },
    data: {
      title: title.trim(),
      content: content as Prisma.InputJsonValue,
      updatedById: session.userId
    }
  });

  if (currentDoc.tenantId) {
    revalidatePath(`/spaces/${currentDoc.tenantId}/docs`);
    revalidatePath(`/spaces/${currentDoc.tenantId}/docs/${docId}`);
  } else {
    revalidatePath('/wiki');
    revalidatePath(`/wiki/${docId}`);
  }

  // Return serializable data
  return {
    id: updated.id,
    title: updated.title,
    updatedAt: updated.updatedAt.toISOString()
  };
}

export async function deleteDocument(docId: string) {
  const session = await requireSession();
  const { doc } = await verifyDocumentAccess(docId, session.userId);

  const document = await prisma.document.findUnique({
    where: { id: docId },
    select: { title: true, tenantId: true }
  });

  if (!document) throw new Error('DOCUMENT_NOT_FOUND');

  await prisma.document.delete({
    where: { id: docId }
  });

  // InboxItem si espace client
  if (document.tenantId) {
    await createDocInboxItem(document.tenantId, docId, document.title, 'deleted');
    revalidatePath(`/spaces/${document.tenantId}/docs`);
  } else {
    revalidatePath('/wiki');
  }

  return { success: true };
}

export async function moveDocument(docId: string, folderId: string | null) {
  const session = await requireSession();
  await verifyDocumentAccess(docId, session.userId);

  const doc = await prisma.document.update({
    where: { id: docId },
    data: { folderId }
  });

  if (doc.tenantId) {
    revalidatePath(`/spaces/${doc.tenantId}/docs`);
  } else {
    revalidatePath('/wiki');
  }

  return doc;
}

// ============================================
// Versioning
// ============================================

export async function getDocumentVersions(docId: string) {
  const session = await requireSession();
  await verifyDocumentAccess(docId, session.userId);

  const versions = await prisma.documentVersion.findMany({
    where: { documentId: docId },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  // Serialize for client components - plain objects only
  return versions.map((v) => ({
    id: v.id,
    title: v.title,
    createdAt: v.createdAt.toISOString(),
    createdBy: v.createdBy ? { id: v.createdBy.id, name: v.createdBy.name, email: v.createdBy.email } : null
  }));
}

export async function restoreVersion(versionId: string) {
  const session = await requireSession();

  const version = await prisma.documentVersion.findUnique({
    where: { id: versionId },
    include: { document: true }
  });

  if (!version) throw new Error('VERSION_NOT_FOUND');

  await verifyDocumentAccess(version.documentId, session.userId);

  // Mettre à jour le document avec le contenu de la version
  const doc = await prisma.document.update({
    where: { id: version.documentId },
    data: {
      title: version.title,
      content: version.content as Prisma.InputJsonValue,
      updatedById: session.userId
    }
  });

  // InboxItem si espace client
  if (doc.tenantId) {
    await createDocInboxItem(doc.tenantId, doc.id, doc.title, 'restored');
    revalidatePath(`/spaces/${doc.tenantId}/docs`);
    revalidatePath(`/spaces/${doc.tenantId}/docs/${doc.id}`);
  } else {
    revalidatePath('/wiki');
    revalidatePath(`/wiki/${doc.id}`);
  }

  return doc;
}

// ============================================
// Sharing
// ============================================

export async function togglePublicShare(docId: string, enabled: boolean) {
  const session = await requireSession();
  await verifyDocumentAccess(docId, session.userId);

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: { title: true, tenantId: true }
  });

  if (!doc) throw new Error('DOCUMENT_NOT_FOUND');

  // Toujours régénérer le token à l'activation
  const publicToken = enabled ? crypto.randomUUID() : null;

  const updated = await prisma.document.update({
    where: { id: docId },
    data: {
      isPublic: enabled,
      publicToken
    }
  });

  // InboxItem si partage activé et espace client
  if (enabled && doc.tenantId) {
    await createDocInboxItem(doc.tenantId, docId, doc.title, 'shared');
  }

  if (doc.tenantId) {
    revalidatePath(`/spaces/${doc.tenantId}/docs/${docId}`);
  } else {
    revalidatePath(`/wiki/${docId}`);
  }

  return updated;
}

// ============================================
// Notification manuelle
// ============================================

export async function notifyDocumentUpdate(docId: string) {
  const session = await requireSession();
  await verifyDocumentAccess(docId, session.userId);

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: { title: true, tenantId: true }
  });

  if (!doc) throw new Error('DOCUMENT_NOT_FOUND');

  // Uniquement pour les espaces client
  if (!doc.tenantId) {
    throw new Error('WIKI_CANNOT_NOTIFY');
  }

  await createDocInboxItem(doc.tenantId, docId, doc.title, 'notified');

  return { success: true };
}

// ============================================
// Fetch helpers
// ============================================

export async function getFoldersAndDocuments(tenantId: string | null) {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  if (tenantId === null && !isAgencyRole(user.role)) {
    throw new Error('ACCESS_DENIED');
  }

  const folders = await prisma.docFolder.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
  });

  const documents = await prisma.document.findMany({
    where: { tenantId },
    select: {
      id: true,
      title: true,
      folderId: true,
      updatedAt: true
    },
    orderBy: { title: 'asc' }
  });

  // Construire l'arborescence des dossiers
  const buildTree = (parentId: string | null): FolderWithChildren[] => {
    return folders
      .filter((f) => f.parentId === parentId)
      .map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        sortOrder: f.sortOrder,
        children: buildTree(f.id)
      }));
  };

  // Serialize dates for client components
  const serializedDocuments = documents.map((d) => ({
    id: d.id,
    title: d.title,
    folderId: d.folderId,
    updatedAt: d.updatedAt.toISOString()
  }));

  return {
    folders: buildTree(null),
    documents: serializedDocuments
  };
}

export async function getFoldersAndDocumentsFull(tenantId: string | null) {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true }
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  if (tenantId === null && !isAgencyRole(user.role)) {
    throw new Error('ACCESS_DENIED');
  }

  const folders = await prisma.docFolder.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
  });

  const documents = await prisma.document.findMany({
    where: { tenantId },
    select: {
      id: true,
      title: true,
      folderId: true,
      content: true,
      updatedAt: true,
      createdBy: { select: { name: true, email: true } }
    },
    orderBy: { title: 'asc' }
  });

  // Construire l'arborescence des dossiers
  const buildTree = (parentId: string | null): FolderWithChildren[] => {
    return folders
      .filter((f) => f.parentId === parentId)
      .map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        sortOrder: f.sortOrder,
        children: buildTree(f.id)
      }));
  };

  // Serialize for client components - must be plain objects, not Prisma references
  // Use JSON.parse(JSON.stringify()) on content to ensure it's a plain object
  const serializedDocuments: DocumentFull[] = documents.map((d) => ({
    id: d.id,
    title: d.title,
    folderId: d.folderId,
    content: JSON.parse(JSON.stringify(d.content)),
    updatedAt: d.updatedAt.toISOString(),
    createdBy: d.createdBy ? { name: d.createdBy.name, email: d.createdBy.email } : null
  }));

  return {
    folders: buildTree(null),
    documents: serializedDocuments
  };
}

export async function getDocument(docId: string) {
  const session = await requireSession();
  await verifyDocumentAccess(docId, session.userId);

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: {
      id: true,
      title: true,
      content: true,
      tenantId: true,
      isPublic: true,
      publicToken: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } }
    }
  });

  if (!doc) return null;

  // Serialize for client components - plain objects only
  // Use JSON.parse(JSON.stringify()) on content to ensure it's a plain object
  return {
    id: doc.id,
    title: doc.title,
    content: JSON.parse(JSON.stringify(doc.content)),
    tenantId: doc.tenantId,
    isPublic: doc.isPublic,
    publicToken: doc.publicToken,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    createdBy: doc.createdBy ? { id: doc.createdBy.id, name: doc.createdBy.name, email: doc.createdBy.email } : null,
    updatedBy: doc.updatedBy ? { id: doc.updatedBy.id, name: doc.updatedBy.name, email: doc.updatedBy.email } : null
  };
}

export async function getPublicDocument(token: string) {
  const doc = await prisma.document.findUnique({
    where: { publicToken: token },
    select: {
      id: true,
      title: true,
      content: true,
      isPublic: true,
      updatedAt: true
    }
  });

  if (!doc || !doc.isPublic) {
    return null;
  }

  // Serialize for client components
  // Use JSON.parse(JSON.stringify()) on content to ensure it's a plain object
  return {
    id: doc.id,
    title: doc.title,
    content: JSON.parse(JSON.stringify(doc.content)),
    isPublic: doc.isPublic,
    updatedAt: doc.updatedAt.toISOString()
  };
}
