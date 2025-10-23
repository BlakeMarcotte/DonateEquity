'use client'

import { useState } from 'react'
import { X, Download, FileText, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuizData } from '@/types/task'
import { getDonationRecommendation } from '@/lib/utils/donation-path-logic'

interface DownloadTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => Promise<void>
  quizData: QuizData | null
  viewOnly?: boolean
}

interface TemplateFile {
  name: string
  description: string
  signers: string
  filePath: string
}

// Template files for each donation model
// TEMPORARY: All files point to the same template until real documents are uploaded
const TEMP_FILE_PATH = '/Users/blakemarcotte/Downloads/Board_Resolution_Corporate_Upfront.pdf'

const MODEL_TEMPLATES: Record<string, TemplateFile[]> = {
  'Corporate Upfront': [
    {
      name: 'Board Resolution',
      description: 'Authorizes issuance of equity or warrant for donation',
      signers: 'CEO + Board Secretary',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Shareholder Resolution (optional)',
      description: 'Approves new share issuance if required by bylaws',
      signers: 'Shareholders / Investors',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Warrant Agreement',
      description: 'Legal contract granting DAF right to purchase pledged shares',
      signers: 'CEO + DAF Representative',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'MOU (DAF – Warrant Model)',
      description: 'Defines how and when DAF may exercise and sell shares',
      signers: 'CEO + DAF Representative',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'MOU (DAF Establishment)',
      description: 'If no DAF exists, sets up new donor-advised fund',
      signers: 'CFO / GC + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'S-1 Disclosure Language',
      description: 'Text for IPO filing describing equity donation',
      signers: 'GC + Legal Counsel',
      filePath: TEMP_FILE_PATH
    }
  ],
  'Corporate Distributed': [
    {
      name: 'Initial Board Resolution',
      description: 'Approves 1% pledge & first tranche',
      signers: 'CEO + Board Secretary',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Annual Board Resolution Template',
      description: 'Year-by-year issuance approval',
      signers: 'CEO + Board Secretary',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Tranche Schedule Addendum',
      description: 'Defines timeline and amount per year',
      signers: 'CFO + GC',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'MOU (DAF – Tranche Model)',
      description: 'Details ongoing donation cadence',
      signers: 'CEO + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'S-1 Disclosure (optional)',
      description: 'For public companies continuing pledge',
      signers: 'GC',
      filePath: TEMP_FILE_PATH
    }
  ],
  'Founder Pre-Exit': [
    {
      name: 'Founder Pledge Agreement',
      description: 'Personal, legally binding commitment',
      signers: 'Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Stock Transfer Agreement',
      description: 'Executes actual share transfer now',
      signers: 'Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'MOU (Founder–DAF)',
      description: 'Defines holding & sale schedule post-liquidity',
      signers: 'Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Appraisal Report / 83(b)',
      description: 'Private-stock valuation for IRS',
      signers: 'Founder + Tax Advisor',
      filePath: TEMP_FILE_PATH
    }
  ],
  'Founder Pre-Exit (Fallback)': [
    {
      name: 'Founder Pledge Agreement',
      description: 'Personal, legally binding commitment',
      signers: 'Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Stock Transfer Agreement',
      description: 'Executes actual share transfer now',
      signers: 'Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'MOU (Founder–DAF)',
      description: 'Defines holding & sale schedule post-liquidity',
      signers: 'Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Appraisal Report / 83(b)',
      description: 'Private-stock valuation for IRS',
      signers: 'Founder + Tax Advisor',
      filePath: TEMP_FILE_PATH
    }
  ],
  'Founder Post-Exit': [
    {
      name: 'Founder Pledge (Deferred)',
      description: 'Commits to donate X% or # shares post-IPO',
      signers: 'Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'MOU (Deferred Model)',
      description: 'Specifies donation trigger (IPO/acquisition)',
      signers: 'Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Post-Exit Transfer Instructions',
      description: 'Step-by-step transfer procedure once liquid',
      signers: 'Founder + CFO + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Tax Receipt & Reporting',
      description: 'Generated after transfer for deduction',
      signers: 'DAF Rep + Founder CPA',
      filePath: TEMP_FILE_PATH
    }
  ],
  'Hybrid Upfront': [
    {
      name: 'Board Resolution (Corporate Portion)',
      description: 'Company authorizes its % donation',
      signers: 'CEO + Board Secretary',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Founder Pledge Agreement (Personal Portion)',
      description: 'Founder commits personal shares',
      signers: 'Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Warrant or Stock Transfer (Corporate)',
      description: 'Executes corporate portion',
      signers: 'CEO + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Stock Transfer (Founder)',
      description: 'Executes founder portion',
      signers: 'Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Unified MOU (Hybrid)',
      description: 'Combines both pledges, defines total fund governance',
      signers: 'CEO + Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Tranche or Timing Addendum',
      description: 'Optional: defines staggered timing',
      signers: 'CFO + GC',
      filePath: TEMP_FILE_PATH
    }
  ],
  'Hybrid Distributed': [
    {
      name: 'Board Resolution (Corporate Portion)',
      description: 'Company authorizes its % donation',
      signers: 'CEO + Board Secretary',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Founder Pledge Agreement (Personal Portion)',
      description: 'Founder commits personal shares',
      signers: 'Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Warrant or Stock Transfer (Corporate)',
      description: 'Executes corporate portion',
      signers: 'CEO + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Stock Transfer (Founder)',
      description: 'Executes founder portion',
      signers: 'Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Unified MOU (Hybrid)',
      description: 'Combines both pledges, defines total fund governance',
      signers: 'CEO + Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Tranche or Timing Addendum',
      description: 'Defines staggered timing for distributed schedule',
      signers: 'CFO + GC',
      filePath: TEMP_FILE_PATH
    }
  ],
  'Hybrid Deferred': [
    {
      name: 'Board Resolution (Corporate Portion)',
      description: 'Company authorizes its % donation',
      signers: 'CEO + Board Secretary',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Founder Pledge Agreement (Personal Portion)',
      description: 'Founder commits personal shares',
      signers: 'Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Warrant or Stock Transfer (Corporate)',
      description: 'Executes corporate portion',
      signers: 'CEO + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Stock Transfer (Founder)',
      description: 'Executes founder portion',
      signers: 'Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Unified MOU (Hybrid)',
      description: 'Combines both pledges, defines total fund governance',
      signers: 'CEO + Founder + DAF Rep',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'Tranche or Timing Addendum',
      description: 'Defines deferred corporate portion after liquidity',
      signers: 'CFO + GC',
      filePath: TEMP_FILE_PATH
    }
  ],
  'Manual Review': [
    {
      name: 'Custom Assessment Form',
      description: 'Form for providing additional details to our team',
      signers: 'Donor / Founder',
      filePath: TEMP_FILE_PATH
    },
    {
      name: 'General Pledge Agreement',
      description: 'Placeholder agreement pending custom recommendation',
      signers: 'To be determined based on review',
      filePath: TEMP_FILE_PATH
    }
  ]
}

export function DownloadTemplatesModal({
  isOpen,
  onClose,
  onComplete,
  quizData,
  viewOnly = false
}: DownloadTemplatesModalProps) {
  const [loading, setLoading] = useState(false)
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(new Set())

  if (!isOpen || !quizData) return null

  const recommendation = getDonationRecommendation(quizData.answers)
  const templates = MODEL_TEMPLATES[recommendation.model] || []

  const handleDownload = (template: TemplateFile) => {
    // Mark as downloaded
    setDownloadedFiles(prev => new Set(prev).add(template.filePath))

    // Trigger download
    const link = document.createElement('a')
    link.href = template.filePath
    link.download = template.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      await onComplete()
    } catch (error) {
      // Error will be handled by parent
      throw error
    } finally {
      setLoading(false)
    }
  }

  const allDownloaded = templates.length > 0 && templates.every(t => downloadedFiles.has(t.filePath))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto w-full max-w-3xl relative">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {viewOnly ? 'Template Details & Signers' : 'Download Your Templates'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {recommendation.model} - {viewOnly ? 'View document requirements' : 'Documentation package'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors duration-200"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-8 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {viewOnly ? 'Document Requirements' : 'Getting Started'}
            </h3>
            <p className="text-gray-700 mb-4">
              {viewOnly ? (
                <>
                  Below are the required documents for the <strong>{recommendation.model}</strong> model.
                  Each document shows who needs to sign it. You can still download templates if needed.
                </>
              ) : (
                <>
                  Download the templates below to begin preparing your donation documentation.
                  These templates are customized for the <strong>{recommendation.model}</strong> model.
                </>
              )}
            </p>
            {!viewOnly && (
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                <li>Download all templates to your computer</li>
                <li>Review each document carefully</li>
                <li>Consult with your legal and tax advisors as needed</li>
                <li>Complete the templates with your specific information</li>
              </ul>
            )}
          </div>

          {/* Template List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Available Templates ({templates.length})
            </h3>
            <div className="space-y-3">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Templates are being prepared for your donation model.</p>
                  <p className="text-sm mt-1">Please check back soon or contact support.</p>
                </div>
              ) : (
                templates.map((template, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        {downloadedFiles.has(template.filePath) ? (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        ) : (
                          <FileText className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 mb-1">
                          {template.name}
                        </h4>
                        <p className="text-sm text-gray-600 mb-1">
                          {template.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Signers:</span> {template.signers}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownload(template)}
                      variant="outline"
                      size="sm"
                      className="ml-4 flex-shrink-0"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Progress Indicator */}
          {templates.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-700 font-medium">Download Progress</span>
                <span className="text-gray-600">
                  {downloadedFiles.size} of {templates.length} files
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(downloadedFiles.size / templates.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Important Note
            </h3>
            <p className="text-gray-700 text-sm">
              These templates are provided as a starting point. We strongly recommend consulting
              with qualified legal and tax professionals before finalizing any documentation.
              Every donation situation is unique and may require customization.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center ${viewOnly ? 'justify-center' : 'justify-between'} px-8 py-6 border-t border-gray-200 bg-gray-50`}>
          {viewOnly ? (
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-8"
            >
              Close
            </Button>
          ) : (
            <>
              <Button
                onClick={onClose}
                variant="outline"
                className="rounded-xl"
                disabled={loading}
              >
                Close
              </Button>

              <Button
                onClick={handleComplete}
                disabled={loading || !allDownloaded}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-8"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    Mark as Complete
                    <CheckCircle className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
