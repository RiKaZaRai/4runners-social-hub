import type { Prisma } from '@prisma/client';

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
