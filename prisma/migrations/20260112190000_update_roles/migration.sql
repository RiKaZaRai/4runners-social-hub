ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM (
  'agency_admin',
  'agency_manager',
  'agency_production',
  'client_admin',
  'client_user'
);

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role"
  USING (
    CASE
      WHEN "role"::text = 'agency_user' THEN 'agency_manager'
      WHEN "role"::text = 'client' THEN 'client_user'
      ELSE "role"::text
    END
  )::"Role";

ALTER TABLE "User"
  ALTER COLUMN "role" SET DEFAULT 'agency_manager';

DROP TYPE "Role_old";
