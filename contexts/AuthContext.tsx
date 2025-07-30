'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { onAuthChange, getCurrentUser } from '@/lib/firebase/auth'
import { db } from '@/lib/firebase/config'
import { UserProfile, UserRole, CustomClaims } from '@/types/auth'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  customClaims: CustomClaims | null
  loading: boolean
  error: string | null
  refreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [customClaims, setCustomClaims] = useState<CustomClaims | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserProfile = async (user: User): Promise<UserProfile | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        return {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          role: data.role,
          organizationId: data.organizationId,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          phoneNumber: user.phoneNumber,
          photoURL: user.photoURL,
          isEmailVerified: user.emailVerified,
          metadata: {
            lastLoginAt: data.metadata?.lastLoginAt?.toDate(),
            signUpMethod: data.metadata?.signUpMethod || 'email',
          },
        } as UserProfile
      }
      return null
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setError('Failed to fetch user profile')
      return null
    }
  }

  const fetchCustomClaims = async (user: User): Promise<CustomClaims | null> => {
    try {
      const idTokenResult = await user.getIdTokenResult()
      const { role, organizationId, permissions } = idTokenResult.claims
      
      if (role) {
        return {
          role: role as UserRole,
          organizationId: organizationId as string,
          permissions: (permissions as string[]) || [],
        }
      }
      return null
    } catch (error) {
      console.error('Error fetching custom claims:', error)
      setError('Failed to fetch user permissions')
      return null
    }
  }

  const refreshUserData = async () => {
    const currentUser = getCurrentUser()
    if (currentUser) {
      setLoading(true)
      try {
        const [profile, claims] = await Promise.all([
          fetchUserProfile(currentUser),
          fetchCustomClaims(currentUser),
        ])
        setUserProfile(profile)
        setCustomClaims(claims)
        setError(null)
      } catch (error) {
        console.error('Error refreshing user data:', error)
        setError('Failed to refresh user data')
      } finally {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setUser(user)
      setLoading(true)
      setError(null)

      if (user) {
        try {
          const [profile, claims] = await Promise.all([
            fetchUserProfile(user),
            fetchCustomClaims(user),
          ])
          setUserProfile(profile)
          setCustomClaims(claims)
        } catch (error) {
          console.error('Error loading user data:', error)
          setError('Failed to load user data')
        }
      } else {
        setUserProfile(null)
        setCustomClaims(null)
      }
      
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value: AuthContextType = {
    user,
    userProfile,
    customClaims,
    loading,
    error,
    refreshUserData,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext