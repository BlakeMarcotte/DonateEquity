'use client'

import { useState, useRef } from 'react'
import { X, CheckCircle, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuizData } from '@/types/task'
import { getDonationRecommendation } from '@/lib/utils/donation-path-logic'
import { FileUpload } from '@/components/files/FileUpload'
import { useParticipantFiles } from '@/hooks/useParticipantFiles'

interface UploadCompletedFilesModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => Promise<void>
  quizData: QuizData | null
  participantId: string
}

interface DocumentTemplate {
  name: string
  description: string
  signers: string
  folder: string
}

// Document templates for each donation model
const MODEL_DOCUMENTS: Record<string, DocumentTemplate[]> = {
  'Corporate Upfront': [
    {
      name: 'Board Resolution',
      description: 'Authorizes issuance of equity or warrant for donation',
      signers: 'CEO + Board Secretary',
      folder: 'board-resolution'
    },
    {
      name: 'Shareholder Resolution (optional)',
      description: 'Approves new share issuance if required by bylaws',
      signers: 'Shareholders / Investors',
      folder: 'shareholder-resolution'
    },
    {
      name: 'Warrant Agreement',
      description: 'Legal contract granting DAF right to purchase pledged shares',
      signers: 'CEO + DAF Representative',
      folder: 'warrant-agreement'
    },
    {
      name: 'MOU (DAF – Warrant Model)',
      description: 'Defines how and when DAF may exercise and sell shares',
      signers: 'CEO + DAF Representative',
      folder: 'mou-warrant'
    },
    {
      name: 'MOU (DAF Establishment)',
      description: 'If no DAF exists, sets up new donor-advised fund',
      signers: 'CFO / GC + DAF Rep',
      folder: 'mou-daf'
    },
    {
      name: 'S-1 Disclosure Language',
      description: 'Text for IPO filing describing equity donation',
      signers: 'GC + Legal Counsel',
      folder: 's1-disclosure'
    }
  ],
  'Corporate Distributed': [
    {
      name: 'Initial Board Resolution',
      description: 'Approves 1% pledge & first tranche',
      signers: 'CEO + Board Secretary',
      folder: 'board-resolution'
    },
    {
      name: 'Annual Board Resolution Template',
      description: 'Year-by-year issuance approval',
      signers: 'CEO + Board Secretary',
      folder: 'annual-board-resolution'
    },
    {
      name: 'Tranche Schedule Addendum',
      description: 'Defines timeline and amount per year',
      signers: 'CFO + GC',
      folder: 'tranche-schedule'
    },
    {
      name: 'MOU (DAF – Tranche Model)',
      description: 'Details ongoing donation cadence',
      signers: 'CEO + DAF Rep',
      folder: 'mou-tranche'
    },
    {
      name: 'S-1 Disclosure (optional)',
      description: 'For public companies continuing pledge',
      signers: 'GC',
      folder: 's1-disclosure'
    }
  ],
  'Founder Pre-Exit': [
    {
      name: 'Founder Pledge Agreement',
      description: 'Personal, legally binding commitment',
      signers: 'Founder + DAF Rep',
      folder: 'founder-pledge'
    },
    {
      name: 'Stock Transfer Agreement',
      description: 'Executes actual share transfer now',
      signers: 'Founder + DAF Rep',
      folder: 'stock-transfer'
    },
    {
      name: 'MOU (Founder–DAF)',
      description: 'Defines holding & sale schedule post-liquidity',
      signers: 'Founder + DAF Rep',
      folder: 'mou-founder'
    },
    {
      name: 'Appraisal Report / 83(b)',
      description: 'Private-stock valuation for IRS',
      signers: 'Founder + Tax Advisor',
      folder: 'appraisal-report'
    }
  ],
  'Founder Pre-Exit (Fallback)': [
    {
      name: 'Founder Pledge Agreement',
      description: 'Personal, legally binding commitment',
      signers: 'Founder + DAF Rep',
      folder: 'founder-pledge'
    },
    {
      name: 'Stock Transfer Agreement',
      description: 'Executes actual share transfer now',
      signers: 'Founder + DAF Rep',
      folder: 'stock-transfer'
    },
    {
      name: 'MOU (Founder–DAF)',
      description: 'Defines holding & sale schedule post-liquidity',
      signers: 'Founder + DAF Rep',
      folder: 'mou-founder'
    },
    {
      name: 'Appraisal Report / 83(b)',
      description: 'Private-stock valuation for IRS',
      signers: 'Founder + Tax Advisor',
      folder: 'appraisal-report'
    }
  ],
  'Founder Post-Exit': [
    {
      name: 'Founder Pledge (Deferred)',
      description: 'Commits to donate X% or # shares post-IPO',
      signers: 'Founder + DAF Rep',
      folder: 'founder-pledge-deferred'
    },
    {
      name: 'MOU (Deferred Model)',
      description: 'Specifies donation trigger (IPO/acquisition)',
      signers: 'Founder + DAF Rep',
      folder: 'mou-deferred'
    },
    {
      name: 'Post-Exit Transfer Instructions',
      description: 'Step-by-step transfer procedure once liquid',
      signers: 'Founder + CFO + DAF Rep',
      folder: 'transfer-instructions'
    },
    {
      name: 'Tax Receipt & Reporting',
      description: 'Generated after transfer for deduction',
      signers: 'DAF Rep + Founder CPA',
      folder: 'tax-receipt'
    }
  ],
  'Hybrid Upfront': [
    {
      name: 'Board Resolution (Corporate Portion)',
      description: 'Company authorizes its % donation',
      signers: 'CEO + Board Secretary',
      folder: 'board-resolution-corporate'
    },
    {
      name: 'Founder Pledge Agreement (Personal Portion)',
      description: 'Founder commits personal shares',
      signers: 'Founder + DAF Rep',
      folder: 'founder-pledge-personal'
    },
    {
      name: 'Warrant or Stock Transfer (Corporate)',
      description: 'Executes corporate portion',
      signers: 'CEO + DAF Rep',
      folder: 'corporate-transfer'
    },
    {
      name: 'Stock Transfer (Founder)',
      description: 'Executes founder portion',
      signers: 'Founder + DAF Rep',
      folder: 'founder-transfer'
    },
    {
      name: 'Unified MOU (Hybrid)',
      description: 'Combines both pledges, defines total fund governance',
      signers: 'CEO + Founder + DAF Rep',
      folder: 'unified-mou'
    },
    {
      name: 'Tranche or Timing Addendum',
      description: 'Optional: defines staggered timing',
      signers: 'CFO + GC',
      folder: 'timing-addendum'
    }
  ],
  'Hybrid Distributed': [
    {
      name: 'Board Resolution (Corporate Portion)',
      description: 'Company authorizes its % donation',
      signers: 'CEO + Board Secretary',
      folder: 'board-resolution-corporate'
    },
    {
      name: 'Founder Pledge Agreement (Personal Portion)',
      description: 'Founder commits personal shares',
      signers: 'Founder + DAF Rep',
      folder: 'founder-pledge-personal'
    },
    {
      name: 'Warrant or Stock Transfer (Corporate)',
      description: 'Executes corporate portion',
      signers: 'CEO + DAF Rep',
      folder: 'corporate-transfer'
    },
    {
      name: 'Stock Transfer (Founder)',
      description: 'Executes founder portion',
      signers: 'Founder + DAF Rep',
      folder: 'founder-transfer'
    },
    {
      name: 'Unified MOU (Hybrid)',
      description: 'Combines both pledges, defines total fund governance',
      signers: 'CEO + Founder + DAF Rep',
      folder: 'unified-mou'
    },
    {
      name: 'Tranche or Timing Addendum',
      description: 'Defines staggered timing for distributed schedule',
      signers: 'CFO + GC',
      folder: 'timing-addendum-distributed'
    }
  ],
  'Hybrid Deferred': [
    {
      name: 'Board Resolution (Corporate Portion)',
      description: 'Company authorizes its % donation',
      signers: 'CEO + Board Secretary',
      folder: 'board-resolution-corporate'
    },
    {
      name: 'Founder Pledge Agreement (Personal Portion)',
      description: 'Founder commits personal shares',
      signers: 'Founder + DAF Rep',
      folder: 'founder-pledge-personal'
    },
    {
      name: 'Warrant or Stock Transfer (Corporate)',
      description: 'Executes corporate portion',
      signers: 'CEO + DAF Rep',
      folder: 'corporate-transfer'
    },
    {
      name: 'Stock Transfer (Founder)',
      description: 'Executes founder portion',
      signers: 'Founder + DAF Rep',
      folder: 'founder-transfer'
    },
    {
      name: 'Unified MOU (Hybrid)',
      description: 'Combines both pledges, defines total fund governance',
      signers: 'CEO + Founder + DAF Rep',
      folder: 'unified-mou'
    },
    {
      name: 'Tranche or Timing Addendum',
      description: 'Defines deferred corporate portion after liquidity',
      signers: 'CFO + GC',
      folder: 'timing-addendum-deferred'
    }
  ],
  'Manual Review': [
    {
      name: 'Custom Assessment Form',
      description: 'Form for providing additional details to our team',
      signers: 'Donor / Founder',
      folder: 'assessment-form'
    },
    {
      name: 'General Pledge Agreement',
      description: 'Placeholder agreement pending custom recommendation',
      signers: 'To be determined based on review',
      folder: 'general-pledge'
    }
  ]
}

export function UploadCompletedFilesModal({
  isOpen,
  onClose,
  onComplete,
  quizData,
  participantId
}: UploadCompletedFilesModalProps) {
  const [loading, setLoading] = useState(false)
  const [uploadedDocuments, setUploadedDocuments] = useState<Set<number>>(new Set())
  const fileUploadRefs = useRef<Record<number, { triggerUpload: () => Promise<void>; hasFiles: () => boolean } | null>>({})
  const { files, uploadFile } = useParticipantFiles(participantId, null)

  if (!isOpen || !quizData) return null

  const recommendation = getDonationRecommendation(quizData.answers)
  const documents = MODEL_DOCUMENTS[recommendation.model] || []

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

  // Check if all required documents are uploaded by checking if files exist in the appropriate folders
  const allUploaded = documents.length > 0 && documents.every((doc, index) => {
    const folderFiles = files.filter(f => f.folder?.includes(doc.folder))
    return folderFiles.length > 0 || uploadedDocuments.has(index)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto w-full max-w-4xl relative">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Upload Completed Documents from Step 3
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {recommendation.model} - Upload the signed versions of your downloaded templates
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
              Upload Your Signed Documents from Step 3
            </h3>
            <p className="text-gray-700 mb-4">
              Upload the <strong>completed and signed versions</strong> of the templates you downloaded in Step 3.
              These are the same documents listed below - now filled out and signed by the required parties.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
              <li>Upload the signed version of each template from Step 3</li>
              <li>Accepted formats: PDF, DOC, DOCX</li>
              <li>Ensure all required signatures are present and legible</li>
              <li>Each document shows who needs to sign it</li>
              <li>Files will be securely stored and reviewed by our team</li>
            </ul>
          </div>

          {/* Document Upload List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Documents from Step 3 - Now Signed ({documents.length})
            </h3>
            <div className="space-y-4">
              {documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No documents required at this time.</p>
                  <p className="text-sm mt-1">Please contact support if you believe this is an error.</p>
                </div>
              ) : (
                documents.map((doc, index) => {
                  const folderFiles = files.filter(f => f.folder?.includes(doc.folder))
                  const hasUpload = folderFiles.length > 0 || uploadedDocuments.has(index)

                  return (
                    <div
                      key={index}
                      className={`bg-white p-6 rounded-xl border-2 transition-all ${
                        hasUpload
                          ? 'border-green-300 bg-green-50/50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="flex-shrink-0">
                            {hasUpload ? (
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            ) : (
                              <FileText className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-semibold text-gray-900 mb-1">
                              {doc.name}
                            </h4>
                            <p className="text-sm text-gray-600 mb-1">
                              {doc.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              <span className="font-medium">Signers:</span> {doc.signers}
                            </p>
                            {hasUpload && folderFiles.length > 0 && (
                              <p className="text-xs text-green-600 mt-2 font-medium">
                                ✓ {folderFiles.length} file{folderFiles.length > 1 ? 's' : ''} uploaded
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* File Upload Component */}
                      <div className="mt-4">
                        <FileUpload
                          ref={(ref) => {
                            fileUploadRefs.current[index] = ref
                          }}
                          onUpload={async (file) => {
                            await uploadFile(file, 'signed-documents')
                            setUploadedDocuments(prev => new Set(prev).add(index))
                          }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Progress Indicator */}
          {documents.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-700 font-medium">Upload Progress</span>
                <span className="text-gray-600">
                  {documents.filter((_, idx) => {
                    const folderFiles = files.filter(f => f.folder?.includes(documents[idx].folder))
                    return folderFiles.length > 0 || uploadedDocuments.has(idx)
                  }).length} of {documents.length} documents
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(documents.filter((_, idx) => {
                      const folderFiles = files.filter(f => f.folder?.includes(documents[idx].folder))
                      return folderFiles.length > 0 || uploadedDocuments.has(idx)
                    }).length / documents.length) * 100}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Warning */}
          {!allUploaded && documents.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Upload All Documents to Continue
                  </h3>
                  <p className="text-sm text-gray-700">
                    You must upload all required documents before you can mark this task as complete.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-6 border-t border-gray-200 bg-gray-50">
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
            disabled={loading || !allUploaded}
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
        </div>
      </div>
    </div>
  )
}
