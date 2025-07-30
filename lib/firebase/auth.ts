import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth'
import { auth } from './config'
import { UserRole } from '@/types/auth'

export interface AuthError {
  code: string
  message: string
}

export const signIn = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (error) {
    throw error as AuthError
  }
}

export const signUp = async (
  email: string,
  password: string,
  displayName: string
): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(userCredential.user, { displayName })
    return userCredential.user
  } catch (error) {
    throw error as AuthError
  }
}

export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    throw error as AuthError
  }
}

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error) {
    throw error as AuthError
  }
}

export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  try {
    const user = auth.currentUser
    if (!user || !user.email) {
      throw new Error('No authenticated user')
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, credential)
    await updatePassword(user, newPassword)
  } catch (error) {
    throw error as AuthError
  }
}

export const onAuthChange = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback)
}

export const getCurrentUser = (): User | null => {
  return auth.currentUser
}

export const getUserRole = async (): Promise<UserRole | null> => {
  const user = auth.currentUser
  if (!user) return null

  const token = await user.getIdTokenResult()
  return (token.claims.role as UserRole) || null
}