'use client'

import { useState, useEffect, useCallback } from 'react'
import { Campaign } from '@/types/campaign'
import { getPublicCampaigns, getCampaignCategories, CampaignFilters } from '@/lib/firebase/campaigns'
import CampaignCard from '@/components/campaigns/CampaignCard'
import { DonorRoute } from '@/components/auth/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  SlidersHorizontal,
  Grid3X3,
  List,
  ChevronDown,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'

interface FilterState extends CampaignFilters {
  sortBy: 'createdAt' | 'goal' | 'currentAmount' | 'title'
  sortOrder: 'asc' | 'desc'
}

export default function BrowseCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | undefined>()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    searchTerm: '',
    minGoal: undefined,
    maxGoal: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })

  const [searchInput, setSearchInput] = useState('')
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await getPublicCampaigns({
        filters: {
          category: filters.category || undefined,
          searchTerm: filters.searchTerm || undefined,
          minGoal: filters.minGoal,
          maxGoal: filters.maxGoal
        },
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        limit: 12
      })

      setCampaigns(result.campaigns)
      setLastDoc(result.lastDoc)
      setHasMore(result.hasMore)
    } catch (err) {
      setError('Failed to load campaigns. Please try again.')
      console.error('Error loading campaigns:', err)
    } finally {
      setLoading(false)
    }
  }, [filters.category, filters.searchTerm, filters.minGoal, filters.maxGoal, filters.sortBy, filters.sortOrder])

  // Load initial data on mount
  useEffect(() => {
    loadInitialData()
    loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Debounced search
  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    const timer = setTimeout(() => {
      if (searchInput !== filters.searchTerm) {
        setFilters(prev => ({ ...prev, searchTerm: searchInput }))
      }
    }, 500)

    setSearchDebounceTimer(timer)

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [searchInput, filters.searchTerm]) // Remove searchDebounceTimer from dependencies

  // Reload campaigns when filters change
  useEffect(() => {
    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.searchTerm, filters.minGoal, filters.maxGoal, filters.sortBy, filters.sortOrder])

  const loadMoreCampaigns = async () => {
    if (!hasMore || loadingMore || !lastDoc) return

    try {
      setLoadingMore(true)
      
      const result = await getPublicCampaigns({
        filters: {
          category: filters.category || undefined,
          searchTerm: filters.searchTerm || undefined,
          minGoal: filters.minGoal,
          maxGoal: filters.maxGoal
        },
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        limit: 12,
        lastDoc
      })

      setCampaigns(prev => [...prev, ...result.campaigns])
      setLastDoc(result.lastDoc)
      setHasMore(result.hasMore)
    } catch (err) {
      setError('Failed to load more campaigns.')
      console.error('Error loading more campaigns:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  const loadCategories = useCallback(async () => {
    try {
      const categoryList = await getCampaignCategories()
      setCategories(categoryList)
    } catch (err) {
      console.error('Error loading categories:', err)
    }
  }, [])

  const handleFilterChange = (key: keyof FilterState, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      category: '',
      searchTerm: '',
      minGoal: undefined,
      maxGoal: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
    setSearchInput('')
  }

  const activeFilterCount = [
    filters.category,
    filters.searchTerm,
    filters.minGoal,
    filters.maxGoal
  ].filter(Boolean).length

  if (loading) {
    return (
      <DonorRoute>
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading campaigns...</p>
              </div>
            </div>
          </div>
        </div>
      </DonorRoute>
    )
  }

  return (
    <DonorRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Campaigns</h1>
            <p className="text-gray-600">Discover meaningful opportunities to make an impact</p>
          </div>

          {/* Search and Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search campaigns, organizations, or causes..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {/* Filters Toggle */}
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-12 px-4"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>

                {/* View Mode Toggle */}
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-3 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  {/* Goal Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Goal ($)
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minGoal || ''}
                      onChange={(e) => handleFilterChange('minGoal', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="h-10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Goal ($)
                    </label>
                    <Input
                      type="number"
                      placeholder="1000000"
                      value={filters.maxGoal || ''}
                      onChange={(e) => handleFilterChange('maxGoal', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="h-10"
                    />
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort By
                    </label>
                    <div className="flex space-x-2">
                      <select
                        value={filters.sortBy}
                        onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                        className="flex-1 h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="createdAt">Date Created</option>
                        <option value="goal">Goal Amount</option>
                        <option value="currentAmount">Amount Raised</option>
                        <option value="title">Title</option>
                      </select>
                      <button
                        onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-3 h-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${filters.sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clear Filters */}
                {activeFilterCount > 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={clearFilters} className="text-sm">
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                <p className="text-red-700">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadInitialData}
                  className="ml-auto"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-gray-600">
              {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* Campaign Grid/List */}
          {campaigns.length > 0 ? (
            <>
              <div className={`grid gap-6 mb-8 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {campaigns.map((campaign) => (
                  <CampaignCard 
                    key={campaign.id} 
                    campaign={campaign}
                    className={viewMode === 'list' ? 'md:flex md:max-w-none' : ''}
                  />
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="text-center">
                  <Button
                    onClick={loadMoreCampaigns}
                    disabled={loadingMore}
                    variant="outline"
                    className="px-8 py-3"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load More Campaigns'
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            !loading && (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
                  <p className="text-gray-600 mb-6">
                    Try adjusting your search terms or filters to find campaigns that match your interests.
                  </p>
                  {activeFilterCount > 0 && (
                    <Button onClick={clearFilters} variant="outline">
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </DonorRoute>
  )
}