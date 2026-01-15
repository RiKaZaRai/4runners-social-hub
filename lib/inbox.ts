import { prisma } from '@/lib/db';
import type { InboxActorType, InboxItemType, InboxStatus } from '@prisma/client';

export interface CreateInboxItemParams {
  spaceId: string;
  type: InboxItemType;
  title: string;
  description?: string;
  actionUrl: string;
  entityKey: string;
  actorType: InboxActorType;
  status?: InboxStatus;
}

/**
 * Crée ou met à jour un item dans l'inbox.
 * Si entityKey existe déjà avec status != done, on update au lieu de créer (anti-spam).
 */
export async function createInboxItem(params: CreateInboxItemParams) {
  const {
    spaceId,
    type,
    title,
    description,
    actionUrl,
    entityKey,
    actorType,
    status = 'unread'
  } = params;

  // Chercher un item existant avec le même entityKey et status != done
  const existing = await prisma.inboxItem.findUnique({
    where: {
      spaceId_entityKey: {
        spaceId,
        entityKey
      }
    }
  });

  if (existing && existing.status !== 'done') {
    // Update l'item existant (anti-spam) en conservant le status courant
    return prisma.inboxItem.update({
      where: { id: existing.id },
      data: {
        title,
        description,
        actionUrl,
        actorType,
        type
      }
    });
  }

  // Créer un nouvel item (ou remplacer un item "done")
  return prisma.inboxItem.upsert({
    where: {
      spaceId_entityKey: {
        spaceId,
        entityKey
      }
    },
    update: {
      title,
      description,
      actionUrl,
      actorType,
      type,
      status
    },
    create: {
      spaceId,
      type,
      title,
      description,
      actionUrl,
      entityKey,
      actorType,
      status
    }
  });
}

/**
 * Met à jour le status d'un item inbox.
 */
export async function updateInboxStatus(itemId: string, status: InboxStatus) {
  return prisma.inboxItem.update({
    where: { id: itemId },
    data: { status }
  });
}

/**
 * Récupère les items inbox pour un espace donné.
 */
export async function getInboxItems(spaceId: string, excludeDone = false) {
  return prisma.inboxItem.findMany({
    where: {
      spaceId,
      ...(excludeDone ? { status: { not: 'done' } } : {})
    },
    orderBy: { updatedAt: 'desc' }
  });
}

/**
 * Récupère tous les items inbox pour plusieurs espaces (vue agence).
 */
export async function getAllInboxItems(spaceIds?: string[], excludeDone = false) {
  return prisma.inboxItem.findMany({
    where: {
      ...(spaceIds ? { spaceId: { in: spaceIds } } : {}),
      ...(excludeDone ? { status: { not: 'done' } } : {})
    },
    include: {
      space: {
        select: { id: true, name: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });
}
