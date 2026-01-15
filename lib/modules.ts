import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export const AVAILABLE_SPACE_MODULES = [
  'messages',
  'social',
  'docs',
  'projects',
  'planning'
] as const;
export type SpaceModuleName = (typeof AVAILABLE_SPACE_MODULES)[number];

export const normalizeModules = (value: Prisma.JsonValue | null | undefined): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
};

export async function getSpaceModules(
  spaceId: string,
  options?: { client?: typeof prisma }
) {
  const client = options?.client ?? prisma;
  const record = await client.tenant.findUnique({
    where: { id: spaceId },
    select: { modules: true }
  });

  return normalizeModules(record?.modules);
}

export async function hasModule(
  spaceId: string,
  moduleName: SpaceModuleName,
  options?: { client?: typeof prisma }
) {
  const modules = await getSpaceModules(spaceId, options);
  return modules.includes(moduleName);
}

export async function ensureModuleEnabled(
  spaceId: string,
  moduleName: SpaceModuleName,
  options?: { client?: typeof prisma }
) {
  const enabled = await hasModule(spaceId, moduleName, options);
  if (!enabled) {
    throw new Error('MODULE_DISABLED');
  }
  return true;
}

export async function setModule(
  spaceId: string,
  moduleName: SpaceModuleName,
  enabled: boolean,
  options?: { client?: typeof prisma }
) {
  const client = options?.client ?? prisma;
  const modules = await getSpaceModules(spaceId, options);
  const has = modules.includes(moduleName);
  const nextModules = enabled
    ? has
      ? modules
      : [...modules, moduleName]
    : modules.filter((entry) => entry !== moduleName);

  await client.tenant.update({
    where: { id: spaceId },
    data: {
      modules: nextModules
    }
  });
}
