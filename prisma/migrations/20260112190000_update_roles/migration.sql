-- Rename old Role type if exists
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') AND
     NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role_old') THEN
    EXECUTE 'ALTER TYPE "Role" RENAME TO "Role_old"';
  END IF;
END $block$;

-- Create new Role type if not exists
DO $block$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    EXECUTE 'CREATE TYPE "Role" AS ENUM (
      ''agency_admin'',
      ''agency_manager'',
      ''agency_production'',
      ''client_admin'',
      ''client_user''
    )';
  END IF;
END $block$;

-- Migrate data from old type to new type
DO $block$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'User'
      AND column_name = 'role'
      AND udt_name = 'Role_old'
  ) THEN
    EXECUTE 'ALTER TABLE "User"
      ALTER COLUMN "role" TYPE "Role"
      USING (
        CASE
          WHEN "role"::text = ''agency_user'' THEN ''agency_manager''
          WHEN "role"::text = ''client'' THEN ''client_user''
          ELSE "role"::text
        END
      )::"Role"';
  END IF;
END $block$;

-- Set default value
ALTER TABLE "User"
  ALTER COLUMN "role" SET DEFAULT 'agency_manager';

-- Drop old type if exists
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role_old') THEN
    EXECUTE 'DROP TYPE "Role_old"';
  END IF;
END $block$;
