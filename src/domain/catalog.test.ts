import { describe, expect, it } from 'vitest'
import { buildAwsSwitchUrl, getTargetPathLabel, searchCatalog } from '@/domain/catalog'
import { defaultAppState } from '@/domain/schema'

describe('catalog domain', () => {
  it('derives full target paths', () => {
    expect(getTargetPathLabel(defaultAppState, 'target-acme-admin')).toBe('Acme Corp / Production / Admin')
  })

  it('ranks actionable target results before folders', () => {
    const results = searchCatalog(defaultAppState, 'admin')

    expect(results[0]?.type).toBe('target')
    expect(results[0]?.label).toBe('Admin')
  })

  it('builds deterministic AWS switch URLs', () => {
    const target = defaultAppState.catalog.targetsById['target-acme-admin']
    const url = buildAwsSwitchUrl(target)

    expect(url).toContain('https://signin.aws.amazon.com/switchrole')
    expect(url).toContain('account=123456789012')
    expect(url).toContain('roleName=AdministratorAccess')
  })
})
