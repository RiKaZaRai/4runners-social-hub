-- CreateTable
CREATE TABLE "SpaceMessage" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorRole" "CommentRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpaceMessage_spaceId_createdAt_idx" ON "SpaceMessage"("spaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "SpaceMessage" ADD CONSTRAINT "SpaceMessage_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceMessage" ADD CONSTRAINT "SpaceMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
