'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from '@/lib/firebase/auth'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

interface LoginFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

export default function LoginForm({ onSuccess, redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUserData, customClaims } = useAuth()

  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      setSuccessMessage(message)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const userCredential = await signIn(email, password)
      await refreshUserData()
      
      if (onSuccess) {
        onSuccess()
      } else {
        // Get the user's custom claims to determine redirect
        const token = await userCredential.user.getIdToken()
        const payload = JSON.parse(atob(token.split('.')[1]))
        const userRole = payload.role

        // If there's a specific redirect, use it
        if (redirectTo) {
          router.push(redirectTo)
        } else {
          // Otherwise, use role-based redirect
          switch (userRole) {
            case 'donor':
              router.push('/my-campaign')
              break
            case 'appraiser':
              router.push('/my-campaign')
              break
            case 'nonprofit_admin':
              router.push('/organization')
              break
            default:
              router.push('/dashboard')
          }
        }
      }
    } catch (error: unknown) {
      console.error('Login error:', error)
      
      const authError = error as { code?: string }
      switch (authError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Invalid email or password')
          break
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.')
          break
        case 'auth/user-disabled':
          setError('Account has been disabled')
          break
        case 'auth/invalid-email':
          setError('Please enter a valid email address')
          break
        default:
          setError('Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-0 shadow-none p-0">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700 font-medium">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              disabled={loading}
              className={error ? 'form-error' : ''}
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700 font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                className={`pr-10 ${error ? 'form-error' : ''}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-10 w-10 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg">
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}