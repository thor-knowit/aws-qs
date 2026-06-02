import type { FolderDraft, TargetDraft } from '@/shared/types'

export const APP_NAME = 'AWS Quick Switch'
export const STORAGE_VERSION = 1
export const STORAGE_KEY = 'awsQuickSwitchState'
export const POPUP_WIDTH = 380

export const EMPTY_FOLDER_DRAFT: FolderDraft = {
  name: '',
  parentId: null,
  color: '#f59e0b',
}

export const EMPTY_TARGET_DRAFT: TargetDraft = {
  displayName: '',
  parentId: null,
  accountId: '',
  accountAlias: '',
  roleName: '',
  destinationPath: '/console/home',
  sourceAccount: '',
  sourceIdentity: '',
}
