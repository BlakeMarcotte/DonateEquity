'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Campaign } from '@/types/campaign'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CalendarDays, 
  Users, 
  Target, 
  MapPin,
  Heart,
  Share2,
  ExternalLink
} from 'lucide-react'

interface CampaignCardProps {
  campaign: Campaign
  className?: string
}

export default function CampaignCard({ campaign, className = '' }: CampaignCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [imageError, setImageError] = useState(false)

  const progressPercentage = Math.min((campaign.currentAmount / campaign.goal) * 100, 100)
  const daysLeft = campaign.endDate 
    ? Math.max(0, Math.ceil((campaign.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return `$${amount.toLocaleString()}`
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: campaign.title,
          text: campaign.description,
          url: `/campaigns/${campaign.id}/donate`
        })
      } catch {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${window.location.origin}/campaigns/${campaign.id}/donate`)
    }
  }

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsLiked(!isLiked)
  }

  return (
    <Card className={`group overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1 ${className}`}>
      <Link href={`/campaigns/${campaign.id}/donate`} className="block">
        {/* Campaign Image */}
        <div className="relative aspect-video overflow-hidden bg-gray-100">
          {campaign.images.hero && !imageError ? (
            <Image
              src={campaign.images.hero}
              alt={campaign.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
              <Target className="w-12 h-12 text-blue-400" />
            </div>
          )}
          
          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-700 shadow-sm">
              {campaign.category}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleLike}
              className={`p-2 rounded-full shadow-sm transition-colors duration-200 ${
                isLiked 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-white/90 text-gray-600 hover:bg-white hover:text-blue-600 shadow-sm transition-colors duration-200"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Days Left Badge */}
          {daysLeft !== null && (
            <div className="absolute bottom-3 right-3">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${
                daysLeft <= 7 
                  ? 'bg-red-100 text-red-700' 
                  : daysLeft <= 30 
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
              }`}>
                <CalendarDays className="w-3 h-3 mr-1" />
                {daysLeft === 0 ? 'Last day' : `${daysLeft} days left`}
              </span>
            </div>
          )}
        </div>

        {/* Campaign Content */}
        <div className="p-6">
          {/* Organization */}
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <MapPin className="w-4 h-4 mr-1" />
            <span className="truncate">{campaign.organizationName}</span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-xl text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
            {campaign.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {campaign.description}
          </p>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {formatAmount(campaign.currentAmount)} raised
              </span>
              <span className="text-sm text-gray-500">
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
              <span>Goal: {formatAmount(campaign.goal)}</span>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                <span>{campaign.donorCount} donors</span>
              </div>
            </div>
          </div>


          {/* CTA Button */}
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 group-hover:bg-blue-700"
          >
            <span>Donate Now</span>
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Link>
    </Card>
  )
}