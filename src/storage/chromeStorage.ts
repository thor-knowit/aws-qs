import { defaultAppState, parseAppState } from '@/domain/schema'
import { STORAGE_KEY } from '@/shared/constants'
import type { AppStorageState } from '@/shared/types'

function getChromeStorageArea() {
  return globalThis.chrome?.storage?.local
}

export async function loadAppState(): Promise<AppStorageState> {
  const area = getChromeStorageArea()

  if (!area) {
    return defaultAppState
  }

  const stored = await area.get(STORAGE_KEY)
  const candidate = stored[STORAGE_KEY]

  if (!candidate) {
    await saveAppState(defaultAppState)
    return defaultAppState
  }

  try {
    return parseAppState(candidate)
  } catch {
    await saveAppState(defaultAppState)
    return defaultAppState
  }
}

export async function saveAppState(state: AppStorageState): Promise<void> {
  const area = getChromeStorageArea()
  if (!area) return

  await area.set({
    [STORAGE_KEY]: state,
  })
}
