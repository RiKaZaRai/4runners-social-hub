import type { Role } from '@prisma/client';

const AGENCY_ROLES: Role[] = ['agency_admin', 'agency_manager', 'agency_production'];
const CLIENT_ROLES: Role[] = ['client_admin', 'client_user'];

export function isAgencyRole(role?: Role | null) {
  return role ? AGENCY_ROLES.includes(role) : false;
}

export function isClientRole(role?: Role | null) {
  return role ? CLIENT_ROLES.includes(role) : false;
}

export function isAgencyAdmin(role?: Role | null) {
  return role === 'agency_admin';
}

export function isAgencyManager(role?: Role | null) {
  return role === 'agency_manager';
}

export function isAgencyProduction(role?: Role | null) {
  return role === 'agency_production';
}

export function canCreateClients(role?: Role | null) {
  if (!role) return false;
  if (role === 'agency_admin') return true;
  if (role !== 'agency_manager') return false;
  return process.env.MANAGER_CAN_CREATE_CLIENTS === 'true';
}
