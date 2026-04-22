import { z } from 'zod'
import { STORAGE_VERSION } from '@/shared/constants'
import type {
  AppStorageState,
  CatalogState,
  FolderDraft,
  FolderNode,
  TargetDraft,
  TargetNode,
} from '@/shared/types'

const folderSchema = z.object({
  id: z.string(),
  type: z.literal('folder'),
  name: z.string().min(1),
  parentId: z.string().nullable(),
  color: z.string().optional(),
})

const targetSchema = z.object({
  id: z.string(),
  type: z.literal('target'),
  parentId: z.string().nullable(),
  displayName: z.string().min(1),
  accountId: z.string().regex(/^(\d{12}|[a-z0-9][a-z0-9-]{1,61}[a-z0-9])$/),
  accountAlias: z.string().optional(),
  roleName: z.string().min(1),
  destinationPath: z.string().optional(),
})

const catalogSchema = z.object({
  foldersById: z.record(z.string(), folderSchema),
  targetsById: z.record(z.string(), targetSchema),
  childrenByFolderId: z.record(z.string(), z.array(z.string())),
  rootChildIds: z.array(z.string()),
})

const usageSchema = z.object({
  favoriteTargetIds: z.array(z.string()),
  recentTargetIds: z.array(z.string()),
  launchCountByTargetId: z.record(z.string(), z.number().int().nonnegative()),
  lastLaunchedAtByTargetId: z.record(z.string(), z.string()),
})

const uiSchema = z.object({
  expandedFolderIds: z.array(z.string()),
  searchQuery: z.string(),
  selectedTargetId: z.string().nullable(),
})

export const appStorageSchema = z.object({
  schemaVersion: z.number().int().default(STORAGE_VERSION),
  catalog: catalogSchema,
  usage: usageSchema,
  ui: uiSchema,
})

export const folderDraftSchema = z.object({
  name: z.string().trim().min(1),
  parentId: z.string().nullable(),
  color: z.string().optional(),
}) satisfies z.ZodType<FolderDraft>

export const targetDraftSchema = z.object({
  displayName: z.string().trim().min(1),
  parentId: z.string().nullable(),
  accountId: z.string().regex(/^(\d{12}|[a-z0-9][a-z0-9-]{1,61}[a-z0-9])$/),
  accountAlias: z.string().optional(),
  roleName: z.string().trim().min(1),
  destinationPath: z.string().optional(),
}) satisfies z.ZodType<TargetDraft>

function createFolder(id: string, name: string, parentId: string | null, color?: string): FolderNode {
  return { id, type: 'folder', name, parentId, color }
}

function createTarget(
  id: string,
  displayName: string,
  parentId: string | null,
  accountId: string,
  roleName: string,
  accountAlias?: string,
  destinationPath?: string,
): TargetNode {
  return {
    id,
    type: 'target',
    parentId,
    displayName,
    accountId,
    accountAlias,
    roleName,
    destinationPath,
  }
}

export const seedCatalog: CatalogState = {
  foldersById: {
    'folder-acme': createFolder('folder-acme', 'Acme Corp', null, '#f59e0b'),
    'folder-acme-prod': createFolder('folder-acme-prod', 'Production', 'folder-acme', '#f97316'),
    'folder-acme-stage': createFolder('folder-acme-stage', 'Staging', 'folder-acme', '#38bdf8'),
    'folder-beta': createFolder('folder-beta', 'Beta Retail', null, '#22c55e'),
    'folder-beta-eu': createFolder('folder-beta-eu', 'EU West', 'folder-beta', '#84cc16'),
  },
  targetsById: {
    'target-acme-admin': createTarget(
      'target-acme-admin',
      'Admin',
      'folder-acme-prod',
      '123456789012',
      'AdministratorAccess',
      'acme-prod',
      '/console/home',
    ),
    'target-acme-readonly': createTarget(
      'target-acme-readonly',
      'Read Only',
      'folder-acme-prod',
      '123456789012',
      'ReadOnlyAccess',
      'acme-prod',
      '/cloudwatch/home',
    ),
    'target-acme-devops': createTarget(
      'target-acme-devops',
      'DevOps',
      'folder-acme-stage',
      '210987654321',
      'PowerUserAccess',
      'acme-stage',
      '/systems-manager/home',
    ),
    'target-beta-support': createTarget(
      'target-beta-support',
      'Support',
      'folder-beta-eu',
      '345678901234',
      'SupportEngineer',
      'beta-eu',
      '/support/home',
    ),
  },
  childrenByFolderId: {
    'folder-acme': ['folder-acme-prod', 'folder-acme-stage'],
    'folder-acme-prod': ['target-acme-admin', 'target-acme-readonly'],
    'folder-acme-stage': ['target-acme-devops'],
    'folder-beta': ['folder-beta-eu'],
    'folder-beta-eu': ['target-beta-support'],
  },
  rootChildIds: ['folder-acme', 'folder-beta'],
}

export const defaultAppState: AppStorageState = {
  schemaVersion: STORAGE_VERSION,
  catalog: seedCatalog,
  usage: {
    favoriteTargetIds: ['target-acme-admin', 'target-beta-support'],
    recentTargetIds: ['target-acme-devops', 'target-acme-admin', 'target-beta-support'],
    launchCountByTargetId: {
      'target-acme-admin': 14,
      'target-acme-readonly': 6,
      'target-acme-devops': 9,
      'target-beta-support': 5,
    },
    lastLaunchedAtByTargetId: {
      'target-acme-admin': '2026-04-22T09:00:00.000Z',
      'target-acme-readonly': '2026-04-21T15:00:00.000Z',
      'target-acme-devops': '2026-04-22T08:45:00.000Z',
      'target-beta-support': '2026-04-20T14:15:00.000Z',
    },
  },
  ui: {
    expandedFolderIds: ['folder-acme', 'folder-acme-prod', 'folder-beta'],
    searchQuery: '',
    selectedTargetId: 'target-acme-admin',
  },
}

export function parseAppState(value: unknown): AppStorageState {
  return appStorageSchema.parse(value)
}
