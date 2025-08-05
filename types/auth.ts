export type UserRole = 'donor' | 'nonprofit_admin' | 'appraiser'

export type NonprofitSubrole = 'admin' | 'member' | 'marketer' | 'signatory'

export interface CustomClaims {
  role: UserRole
  subrole?: NonprofitSubrole
  organizationId?: string
  permissions: string[]
}

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: UserRole
  subrole?: NonprofitSubrole
  organizationId?: string
  createdAt: Date
  updatedAt: Date
  phoneNumber?: string
  photoURL?: string
  isEmailVerified: boolean
  metadata: {
    lastLoginAt?: Date
    signUpMethod: 'email' | 'google' | 'apple'
  }
}