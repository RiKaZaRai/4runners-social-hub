-- Update foreign keys to match schema (cascade on delete)
ALTER TABLE "TenantMembership" DROP CONSTRAINT "TenantMembership_tenantId_fkey";
ALTER TABLE "TenantMembership" DROP CONSTRAINT "TenantMembership_userId_fkey";

ALTER TABLE "TenantMembership"
  ADD CONSTRAINT "TenantMembership_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMembership"
  ADD CONSTRAINT "TenantMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
