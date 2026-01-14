-- Drop default first (required before type change)
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

-- Rename old Role type if exists
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') AND
     NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role_old') THEN
    EXECUTE 'ALTER TYPE "Role" RENAME TO "Role_old"';
  END IF;
END $block$;

-- Create new Role type
CREATE TYPE "Role" AS ENUM (
  'agency_admin',
  'agency_manager',
  'agency_production',
  'client_admin',
  'client_user'
);

-- Migrate column to new type
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role"
  USING (
    CASE
      WHEN "role"::text = 'agency_user' THEN 'agency_manager'
      WHEN "role"::text = 'client' THEN 'client_user'
      ELSE "role"::text
    END
  )::"Role";

-- Set new default
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'agency_manager';

-- Drop old type
DROP TYPE IF EXISTS "Role_old";
