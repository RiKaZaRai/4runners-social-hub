-- Add active field to Tenant
ALTER TABLE "Tenant" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
