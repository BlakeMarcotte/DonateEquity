'use client'

import { NonprofitAdminRoute } from '@/components/auth/ProtectedRoute'
import { useState } from 'react'
import {
  FileText,
  Download,
  ExternalLink,
  Search,
  BookOpen,
  Video,
  File,
  Users,
  DollarSign,
  Scale,
  Calculator,
  HelpCircle,
  Star,
  Clock,
  Tag
} from 'lucide-react'

interface Resource {
  id: string
  title: string
  description: string
  type: 'guide' | 'template' | 'video' | 'webinar' | 'case-study' | 'legal' | 'tax'
  category: 'getting-started' | 'campaign-management' | 'legal-compliance' | 'tax-benefits' | 'donor-relations' | 'best-practices'
  url?: string
  downloadUrl?: string
  duration?: string
  rating: number
  featured: boolean
  tags: string[]
  lastUpdated: Date
}

const mockResources: Resource[] = [
  {
    id: '1',
    title: 'Getting Started: Your First Equity Donation Campaign',
    description: 'Complete guide to launching your first successful equity donation campaign, from setup to completion.',
    type: 'guide',
    category: 'getting-started',
    url: '/resources/getting-started-guide',
    rating: 4.9,
    featured: true,
    tags: ['beginner', 'campaign setup', 'fundraising'],
    lastUpdated: new Date('2024-01-15')
  },
  {
    id: '2',
    title: 'Tax Benefits Calculator Masterclass',
    description: 'Learn how to effectively use our calculator to demonstrate value to potential donors.',
    type: 'video',
    category: 'tax-benefits',
    url: '/resources/calculator-masterclass',
    duration: '25 min',
    rating: 4.8,
    featured: true,
    tags: ['calculator', 'tax benefits', 'donor education'],
    lastUpdated: new Date('2024-01-10')
  },
  {
    id: '3',
    title: 'Donor Communication Templates',
    description: 'Pre-written email templates for every stage of the donor journey.',
    type: 'template',
    category: 'donor-relations',
    downloadUrl: '/downloads/donor-templates.zip',
    rating: 4.7,
    featured: false,
    tags: ['templates', 'communication', 'donor outreach'],
    lastUpdated: new Date('2024-01-08')
  },
  {
    id: '4',
    title: 'Legal Compliance Checklist',
    description: 'Essential legal requirements and compliance steps for equity donation programs.',
    type: 'legal',
    category: 'legal-compliance',
    downloadUrl: '/downloads/legal-checklist.pdf',
    rating: 4.6,
    featured: true,
    tags: ['legal', 'compliance', 'checklist'],
    lastUpdated: new Date('2024-01-05')
  },
  {
    id: '5',
    title: 'Case Study: Tech Startup Raises $2M',
    description: 'How a Series B startup successfully raised $2M through equity donation commitments.',
    type: 'case-study',
    category: 'best-practices',
    url: '/resources/case-study-tech-startup',
    rating: 4.8,
    featured: false,
    tags: ['case study', 'success story', 'tech startup'],
    lastUpdated: new Date('2024-01-02')
  },
  {
    id: '6',
    title: 'Quarterly Webinar: Market Trends in Equity Giving',
    description: 'Join our quarterly webinar discussing the latest trends and opportunities in equity philanthropy.',
    type: 'webinar',
    category: 'best-practices',
    url: '/resources/quarterly-webinar',
    duration: '60 min',
    rating: 4.5,
    featured: false,
    tags: ['webinar', 'trends', 'market insights'],
    lastUpdated: new Date('2023-12-28')
  }
]

const categories = [
  { id: 'all', name: 'All Resources', icon: FileText },
  { id: 'getting-started', name: 'Getting Started', icon: BookOpen },
  { id: 'campaign-management', name: 'Campaign Management', icon: Users },
  { id: 'tax-benefits', name: 'Tax Benefits', icon: Calculator },
  { id: 'legal-compliance', name: 'Legal & Compliance', icon: Scale },
  { id: 'donor-relations', name: 'Donor Relations', icon: Users },
  { id: 'best-practices', name: 'Best Practices', icon: Star },
]

const resourceTypes = [
  { id: 'all', name: 'All Types', icon: FileText },
  { id: 'guide', name: 'Guides', icon: BookOpen },
  { id: 'template', name: 'Templates', icon: File },
  { id: 'video', name: 'Videos', icon: Video },
  { id: 'webinar', name: 'Webinars', icon: Users },
  { id: 'case-study', name: 'Case Studies', icon: Star },
  { id: 'legal', name: 'Legal Docs', icon: Scale },
]

export default function ResourcesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [resources] = useState<Resource[]>(mockResources)

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory
    const matchesType = selectedType === 'all' || resource.type === selectedType

    return matchesSearch && matchesCategory && matchesType
  })

  const featuredResources = resources.filter(resource => resource.featured)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'guide': return BookOpen
      case 'template': return File
      case 'video': return Video
      case 'webinar': return Users
      case 'case-study': return Star
      case 'legal': return Scale
      case 'tax': return Calculator
      default: return FileText
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'guide': return 'bg-blue-100 text-blue-800'
      case 'template': return 'bg-green-100 text-green-800'
      case 'video': return 'bg-purple-100 text-purple-800'
      case 'webinar': return 'bg-orange-100 text-orange-800'
      case 'case-study': return 'bg-yellow-100 text-yellow-800'
      case 'legal': return 'bg-red-100 text-red-800'
      case 'tax': return 'bg-indigo-100 text-indigo-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <NonprofitAdminRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Resources</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Guides, templates, and tools to maximize your fundraising success
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Featured Resources */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredResources.map((resource) => {
                const TypeIcon = getTypeIcon(resource.type)
                return (
                  <div key={resource.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                    <div className="p-6">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <TypeIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getTypeColor(resource.type)}`}>
                          {resource.type.replace('-', ' ')}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {resource.title}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {resource.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          {renderStars(resource.rating)}
                          <span className="text-sm text-gray-500 ml-1">
                            {resource.rating}
                          </span>
                        </div>
                        
                        {resource.duration && (
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>{resource.duration}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {resource.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {resource.downloadUrl && (
                              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200">
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            {resource.url && (
                              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200">
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-4">
                <div className="min-w-0 flex-1 lg:min-w-[150px]">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="min-w-0 flex-1 lg:min-w-[150px]">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    {resourceTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* All Resources */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                All Resources ({filteredResources.length})
              </h2>
            </div>

            {filteredResources.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <HelpCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No resources found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search terms or filters.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {filteredResources.map((resource) => {
                    const TypeIcon = getTypeIcon(resource.type)
                    return (
                      <div key={resource.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <TypeIcon className="w-6 h-6 text-gray-600" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {resource.title}
                                </h3>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getTypeColor(resource.type)}`}>
                                  {resource.type.replace('-', ' ')}
                                </span>
                              </div>
                              
                              <p className="text-gray-600 mb-3">
                                {resource.description}
                              </p>
                              
                              <div className="flex items-center space-x-6 text-sm text-gray-500">
                                <div className="flex items-center space-x-1">
                                  {renderStars(resource.rating)}
                                  <span className="ml-1">{resource.rating}</span>
                                </div>
                                
                                {resource.duration && (
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{resource.duration}</span>
                                  </div>
                                )}
                                
                                <span>Updated {resource.lastUpdated.toLocaleDateString()}</span>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 mt-3">
                                {resource.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600"
                                  >
                                    <Tag className="w-3 h-3 mr-1" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-6">
                            {resource.downloadUrl && (
                              <button className="inline-flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200">
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                              </button>
                            )}
                            {resource.url && (
                              <button className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200">
                                <ExternalLink className="w-4 h-4" />
                                <span>View</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <HelpCircle className="h-6 w-6 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-blue-900 mb-2">Need More Help?</h3>
                <p className="text-sm text-blue-800 mb-4">
                  Can't find what you're looking for? Our support team is here to help you succeed.
                </p>
                <div className="flex items-center space-x-4">
                  <button className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200">
                    <Users className="w-4 h-4" />
                    <span>Contact Support</span>
                  </button>
                  <button className="inline-flex items-center space-x-2 px-4 py-2 bg-white hover:bg-blue-50 text-blue-600 font-medium border border-blue-600 rounded-lg transition-colors duration-200">
                    <BookOpen className="w-4 h-4" />
                    <span>Schedule Training</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NonprofitAdminRoute>
  )
}