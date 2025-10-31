import { UserRole, NonprofitSubrole } from '@/types/auth'

/**
 * Generates a random 8-character alphanumeric invite code
 * @returns {string} An 8-character uppercase alphanumeric string
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excluded similar looking chars: 0, O, 1, I
  let code = ''

  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    code += chars[randomIndex]
  }

  return code
}

/**
 * Validates the format of an invite code
 * @param {string} code - The code to validate
 * @returns {boolean} True if the code format is valid
 */
export function validateInviteCodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false
  }

  // Must be exactly 8 characters, alphanumeric, uppercase
  const codeRegex = /^[A-Z0-9]{8}$/
  return codeRegex.test(code)
}

/**
 * Maps invite code type to the corresponding user role and subrole
 * @param {string} codeType - The type of invite code (admin, member, appraiser, donor)
 * @returns {object} Object containing role and optional subrole
 */
export function getGrantedRoleFromCodeType(
  codeType: 'admin' | 'member' | 'appraiser' | 'donor'
): { role: UserRole; subrole?: NonprofitSubrole } {
  switch (codeType) {
    case 'admin':
      return { role: 'nonprofit_admin', subrole: 'admin' }
    case 'member':
      return { role: 'nonprofit_admin', subrole: 'member' }
    case 'appraiser':
      return { role: 'appraiser' }
    case 'donor':
      return { role: 'donor' }
  }
}

/**
 * Determines which code type matches the given code in an organization
 * @param {object} inviteCodes - The organization's invite codes object
 * @param {string} code - The code to match
 * @returns {string | null} The code type ('admin', 'member', 'appraiser', 'donor') or null if not found
 */
export function getCodeTypeFromCode(
  inviteCodes: {
    admin?: string
    member?: string
    appraiser?: string
    donor?: string
  },
  code: string
): 'admin' | 'member' | 'appraiser' | 'donor' | null {
  const normalizedCode = code.toUpperCase().trim()

  if (inviteCodes.admin === normalizedCode) return 'admin'
  if (inviteCodes.member === normalizedCode) return 'member'
  if (inviteCodes.appraiser === normalizedCode) return 'appraiser'
  if (inviteCodes.donor === normalizedCode) return 'donor'

  return null
}

/**
 * Gets the role and subrole granted by a specific invite code in an organization
 * @param {object} inviteCodes - The organization's invite codes object
 * @param {string} code - The invite code to check
 * @returns {object | null} Object with role and optional subrole, or null if code not found
 */
export function getRoleFromInviteCode(
  inviteCodes: {
    admin?: string
    member?: string
    appraiser?: string
    donor?: string
  },
  code: string
): { role: UserRole; subrole?: NonprofitSubrole } | null {
  const codeType = getCodeTypeFromCode(inviteCodes, code)

  if (!codeType) {
    return null
  }

  return getGrantedRoleFromCodeType(codeType)
}
