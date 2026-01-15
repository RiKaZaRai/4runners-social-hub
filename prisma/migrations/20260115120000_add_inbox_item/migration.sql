-- CreateEnum
CREATE TYPE "InboxActorType" AS ENUM ('agency', 'client', 'system');

-- CreateEnum
CREATE TYPE "InboxItemType" AS ENUM ('message', 'validation', 'signal');

-- CreateEnum
CREATE TYPE "InboxStatus" AS ENUM ('unread', 'open', 'done', 'blocked');

-- CreateTable
CREATE TABLE "InboxItem" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "actorType" "InboxActorType" NOT NULL,
    "type" "InboxItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "actionUrl" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "status" "InboxStatus" NOT NULL DEFAULT 'unread',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InboxItem_spaceId_status_idx" ON "InboxItem"("spaceId", "status");

-- CreateIndex
CREATE INDEX "InboxItem_updatedAt_idx" ON "InboxItem"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InboxItem_spaceId_entityKey_key" ON "InboxItem"("spaceId", "entityKey");

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
