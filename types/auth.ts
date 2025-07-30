export type UserRole = 'donor' | 'nonprofit_admin' | 'appraiser' | 'admin'

export interface CustomClaims {
  role: UserRole
  organizationId?: string
  permissions: string[]
}

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: UserRole
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