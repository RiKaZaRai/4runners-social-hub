-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('viewer', 'client_admin');

-- AlterTable
ALTER TABLE "TenantMembership" ADD COLUMN "role" "TenantRole" NOT NULL DEFAULT 'viewer',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
