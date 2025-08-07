'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { User } from 'firebase/auth'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { Campaign } from '@/types/campaign'
import { UserProfile } from '@/types/auth'
import { getCampaignById } from '@/lib/firebase/campaigns'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { DonorRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft,
  Heart,
  Share2,
  Target,
  Users,
  CalendarDays,
  MapPin,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Info,
  Building2,
  Mail,
  Facebook,
  Twitter,
  Copy,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react'

export default function DonateCampaignPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, userProfile } = useAuth()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  // Invitation context from URL parameters
  const invitationToken = searchParams.get('invitation')
  const inviterName = searchParams.get('inviter')
  const inviterMessage = searchParams.get('message')

  useEffect(() => {
    if (params.id) {
      fetchCampaignDetails()
    }
  }, [params.id])

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const campaignData = await getCampaignById(params.id as string)
      
      if (!campaignData) {
        setError('Campaign not found')
        return
      }

      // Check if campaign is public and active
      if (campaignData.visibility !== 'public') {
        setError('This campaign is not publicly available')
        return
      }

      if (campaignData.status !== 'active') {
        setError('This campaign is not currently accepting donations')
        return
      }

      setCampaign(campaignData)
    } catch (err) {
      console.error('Error fetching campaign:', err)
      setError('Failed to load campaign details')
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return `$${amount.toLocaleString()}`
  }

  const formatFullAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const progressPercentage = campaign 
    ? Math.min((campaign.currentAmount / campaign.goal) * 100, 100)
    : 0

  const daysLeft = campaign?.endDate 
    ? Math.max(0, Math.ceil((campaign.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null

  const handleShare = async () => {
    const url = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: campaign?.title,
          text: campaign?.description,
          url
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url)
    }
  }

  const shareToSocial = (platform: string) => {
    if (!campaign) return
    
    const text = `Support ${campaign.title} - Help us reach our goal of ${formatFullAmount(campaign.goal)}`
    const url = window.location.href

    let shareLink = ''
    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        break
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
      case 'email':
        shareLink = `mailto:?subject=${encodeURIComponent(campaign.title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`
        break
    }

    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=400')
    }
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
  }

  if (loading) {
    return (
      <DonorRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading campaign...</p>
          </div>
        </div>
      </DonorRoute>
    )
  }

  if (error || !campaign) {
    return (
      <DonorRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error || 'Campaign not found'}
            </h2>
            <p className="text-gray-600 mb-6">
              {`The campaign you're looking for may have been removed or is no longer available.`}
            </p>
            <div className="flex space-x-4 justify-center">
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => router.push('/browse')}>
                Browse Campaigns
              </Button>
            </div>
          </div>
        </div>
      </DonorRoute>
    )
  }

  return (
    <DonorRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-4 flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Browse
              </button>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleLike}
                  className={`p-2 rounded-full transition-colors duration-200 ${
                    isLiked 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors duration-200"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Invitation Welcome Banner */}
          {invitationToken && inviterName && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Welcome! You were invited by {decodeURIComponent(inviterName)}
                  </h3>
                  <p className="text-blue-800 mb-3">
                    Thank you for accepting the invitation to support this campaign. 
                    {inviterMessage && ` They included a personal message for you:`}
                  </p>
                  {inviterMessage && (
                    <div className="bg-white border border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-gray-700 italic">
                        {`"${decodeURIComponent(inviterMessage)}"`}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-blue-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>Invitation accepted successfully</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Remove invitation parameters from URL
                    const newUrl = window.location.pathname
                    window.history.replaceState({}, '', newUrl)
                  }}
                  className="text-blue-400 hover:text-blue-600 transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Hero Image */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                {campaign.images.hero && !imageError ? (
                  <Image
                    src={campaign.images.hero}
                    alt={campaign.title}
                    fill
                    className="object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <Target className="w-16 h-16 text-blue-400" />
                  </div>
                )}
                
                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/90 text-gray-700 shadow-sm">
                    {campaign.category}
                  </span>
                </div>

                {/* Days Left Badge */}
                {daysLeft !== null && (
                  <div className="absolute top-4 right-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium shadow-sm ${
                      daysLeft <= 7 
                        ? 'bg-red-100 text-red-700' 
                        : daysLeft <= 30 
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                    }`}>
                      <CalendarDays className="w-4 h-4 mr-1" />
                      {daysLeft === 0 ? `Last day` : `${daysLeft} days left`}
                    </span>
                  </div>
                )}
              </div>

              {/* Campaign Details */}
              <div className="bg-white rounded-xl shadow-sm p-8">
                {/* Organization */}
                <div className="flex items-center text-gray-600 mb-4">
                  <Building2 className="w-5 h-5 mr-2" />
                  <span className="font-medium">{campaign.organizationName}</span>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {campaign.title}
                </h1>

                {/* Description */}
                <div className="prose prose-gray max-w-none mb-8">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    {campaign.description}
                  </p>
                </div>

                {/* Tags */}
                {campaign.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {campaign.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Progress Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Campaign Progress</h3>
                    <span className="text-sm text-gray-500">
                      {progressPercentage.toFixed(0)}% of goal
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  {/* Progress Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatAmount(campaign.currentAmount)}
                      </p>
                      <p className="text-sm text-gray-600">Raised</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatAmount(campaign.goal)}
                      </p>
                      <p className="text-sm text-gray-600">Goal</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {campaign.donorCount}
                      </p>
                      <p className="text-sm text-gray-600">Donors</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Share Section */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Share This Campaign</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => shareToSocial('twitter')}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
                  >
                    <Twitter className="w-4 h-4" />
                    <span>Twitter</span>
                  </button>
                  <button
                    onClick={() => shareToSocial('facebook')}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                  >
                    <Facebook className="w-4 h-4" />
                    <span>Facebook</span>
                  </button>
                  <button
                    onClick={() => shareToSocial('email')}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(window.location.href)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Donation Card */}
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {formatFullAmount(campaign.currentAmount)}
                  </div>
                  <div className="text-gray-600">
                    raised of {formatFullAmount(campaign.goal)} goal
                  </div>
                </div>

                <Button
                  onClick={() => setShowDonationModal(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 text-lg rounded-lg mb-4"
                >
                  <Heart className="w-5 h-5 mr-2" />
                  Commit Equity
                </Button>

                {/* Quick Stats */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Donors
                    </span>
                    <span className="font-medium text-gray-900">{campaign.donorCount}</span>
                  </div>
                  
                  {daysLeft !== null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        Time left
                      </span>
                      <span className="font-medium text-gray-900">
                        {daysLeft === 0 ? `Last day` : `${daysLeft} days`}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center">
                      <Target className="w-4 h-4 mr-2" />
                      Progress
                    </span>
                    <span className="font-medium text-gray-900">
                      {progressPercentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Trust Indicators */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Verified nonprofit organization
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Secure donation processing
                  </div>
                </div>
              </div>

              {/* Organization Info */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  About {campaign.organizationName}
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>Verified Organization</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="w-4 h-4 mr-2" />
                    <span>Nonprofit Status</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {/* TODO: Navigate to organization page */}}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Organization
                  </Button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <h4 className="font-medium text-blue-900 mb-1">
                      Your donation is secure
                    </h4>
                    <p className="text-blue-800">
                      All donations are processed securely and your information is protected with enterprise-grade encryption.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Donation Modal */}
        {showDonationModal && (
          <DonationModal
            campaign={campaign}
            onClose={() => setShowDonationModal(false)}
            user={user}
            userProfile={userProfile}
            router={router}
          />
        )}
      </div>
    </DonorRoute>
  )
}

// Donation Modal Component
function DonationModal({
  campaign,
  onClose,
  user,
  userProfile,
  router
}: {
  campaign: Campaign
  onClose: () => void
  user: User
  userProfile: UserProfile | null
  router: AppRouterInstance
}) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    amount: '',
    message: ''
  })
  
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizationName, setOrganizationName] = useState<string>('Individual Donor')

  // Fetch organization name when modal opens
  useEffect(() => {
    const fetchOrganizationName = async () => {
      if (userProfile?.organizationId) {
        try {
          const orgDoc = await getDoc(doc(db, 'organizations', userProfile.organizationId))
          if (orgDoc.exists()) {
            setOrganizationName(orgDoc.data().name || 'Unknown Organization')
          }
        } catch (error) {
          console.error('Error fetching organization:', error)
        }
      }
    }
    
    fetchOrganizationName()
  }, [userProfile?.organizationId])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const validateStep1 = () => {
    const amount = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      setError('Please enter a valid donation amount')
      return false
    }
    if (amount < 100) {
      setError('Minimum donation amount is $100')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    // No additional validation needed for step 2 (review)
    return true
  }

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return

    setSubmitting(true)
    setError(null)

    try {
      const token = await user.getIdToken()
      
      const donationData = {
        campaignId: campaign.id,
        amount: parseFloat(formData.amount),
        message: formData.message
      }

      const response = await fetch('/api/donations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(donationData)
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        setStep(3) // Success step (now step 3 instead of 4)
      } else {
        setError(result.error || 'Failed to create donation')
      }
    } catch (err) {
      setError('An error occurred while processing your donation')
      console.error('Donation error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount)
    return isNaN(num) ? '$0' : new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {success ? 'Equity Commitment Complete!' : `Commit Equity to ${campaign.title}`}
            </h2>
            {!success && (
              <div className="flex items-center mt-2">
                <div className="flex items-center space-x-2">
                  {[1, 2].map((stepNum) => (
                    <div key={stepNum} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step >= stepNum ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {stepNum}
                      </div>
                      {stepNum < 2 && (
                        <div className={`w-8 h-0.5 ${step > stepNum ? 'bg-blue-600' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  ))}
                </div>
                <span className="ml-4 text-sm text-gray-600">
                  Step {step} of 2
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Commitment Amount */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <TrendingUp className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Equity Commitment
                </h3>
                <p className="text-gray-600">
                  Commit to donate equity upon a future liquidity event (IPO, acquisition, etc.)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commitment Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10000"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Minimum amount: $100 • Current value: {formatAmount(formData.amount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add a message of support for this campaign..."
                />
              </div>


              <div className="flex justify-end">
                <Button onClick={handleNext} disabled={!formData.amount}>
                  Next: Review
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Review and Confirm */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Your Equity Commitment</h3>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Campaign:</span>
                    <span className="font-medium text-gray-900">{campaign.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Commitment Type:</span>
                    <span className="font-medium text-gray-900">Equity Commitment</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium text-gray-900">{formatAmount(formData.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your Organization:</span>
                    <span className="font-medium text-gray-900">
                      {organizationName}
                    </span>
                  </div>
                  {formData.message && (
                    <div className="pt-4 border-t border-gray-200">
                      <span className="text-gray-600 block mb-2">Message:</span>
                      <p className="text-gray-900 italic">{`"${formData.message}"`}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <h4 className="font-medium mb-1">{`What happens next?`}</h4>
                    <p>
                      {`Your equity commitment will be recorded and a professional appraiser will be assigned to facilitate the process. You'll receive updates throughout the workflow.`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Commit Equity'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && success && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Equity Commitment Created!
              </h3>
              <p className="text-gray-600 mb-6">
                {`Your equity commitment has been recorded. You'll receive updates as we process your commitment through the appraisal and documentation workflow.`}
              </p>
              <div className="space-y-3">
                <Button onClick={onClose} className="w-full">
                  Close
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/donations')}
                  className="w-full"
                >
                  View My Donations
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}