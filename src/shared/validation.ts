import type { ZodObject, ZodRawShape } from 'zod'

/** Validate a draft against a Zod schema, returning a field → message map. */
export function validateDraft<T extends ZodRawShape>(
  schema: ZodObject<T>,
  draft: unknown,
): Record<string, string> {
  const result = schema.safeParse(draft)
  if (result.success) return {}

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const field = issue.path.join('.')
    if (!errors[field]) {
      errors[field] = humanize(field, issue.message)
    }
  }
  return errors
}

/** Make Zod's terse messages readable for end users. */
function humanize(field: string, message: string): string {
  // "Too small: expected string to have >=1 characters"
  if (message.includes('>=1 characters')) return 'Required'

  // accountId accepts 12-digit ID or account alias
  if (field === 'accountId' && message.includes('pattern')) return '12-digit ID or account alias'

  // Generic fallbacks
  if (message.startsWith('Too small')) return 'Too short'
  if (message.startsWith('Invalid string')) return 'Invalid format'
  if (message === 'Required') return 'Required'

  return message
}
