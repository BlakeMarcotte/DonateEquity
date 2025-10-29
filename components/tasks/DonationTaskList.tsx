'use client'

import { useState, useRef } from 'react'
import { useParticipantTasks } from '@/hooks/useParticipantTasks'
import { CommitmentDecisionTask } from './CommitmentDecisionTask'
import { useAuth } from '@/contexts/AuthContext'
import { Task, TaskCompletionData, CommitmentData } from '@/types/task'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, AlertCircle, Lock, Mail, RotateCcw, FileSignature, Upload, RefreshCw } from 'lucide-react'
import { AppraiserInvitationForm } from './AppraiserInvitationForm'
import { AppraisalMethodTask } from './AppraisalMethodTask'
import { FileUpload } from '@/components/files/FileUpload'
import { useParticipantFiles } from '@/hooks/useParticipantFiles'
import { Modal } from '@/components/ui/modal'
import { EquityCommitmentModal } from './EquityCommitmentModal'


interface DonationTaskListProps {
  participantId?: string
  donationId?: string // For donation-based tasks (donors)
  campaignId?: string
  showAllTasks?: boolean // Show tasks for all roles (admin view)
  // Allow passing tasks and handlers from parent
  tasks?: Task[]
  loading?: boolean
  completeTask?: (taskId: string, completionData?: TaskCompletionData) => Promise<void>
  handleCommitmentDecision?: (taskId: string, decision: 'commit_now' | 'commit_after_appraisal', commitmentData?: CommitmentData) => Promise<void>
  campaignTitle?: string
  donorName?: string
  organizationName?: string
}

export function DonationTaskList({
  participantId,
  donationId,
  showAllTasks = false,
  tasks: externalTasks,
  loading: externalLoading,
  completeTask: externalCompleteTask,
  handleCommitmentDecision,
  campaignTitle,
  donorName,
  organizationName
}: DonationTaskListProps) {
  // Calculate effective ID FIRST, before any hooks
  const effectiveId = participantId || donationId

  const { user, customClaims } = useAuth()
  const { tasks: participantTasks, loading: participantLoading, completeTask: participantCompleteTask } = useParticipantTasks(participantId || null)
  
  // Use external tasks/handlers if provided, otherwise use participant tasks
  const tasks = externalTasks || participantTasks
  const loading = externalLoading !== undefined ? externalLoading : participantLoading
  const completeTask = externalCompleteTask || participantCompleteTask
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set())
  const [showInvitationModal, setShowInvitationModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [currentUploadTask, setCurrentUploadTask] = useState<Task | null>(null)
  const [resettingTasks, setResettingTasks] = useState(false)
  const [showCommitmentModal, setShowCommitmentModal] = useState(false)
  const [currentCommitmentTask, setCurrentCommitmentTask] = useState<Task | null>(null)
  const [showResetModal, setShowResetModal] = useState(false)
  const [docuSignLoading, setDocuSignLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { uploadFile } = useParticipantFiles(effectiveId || null, null)
  const fileUploadRef = useRef<{ triggerUpload: () => Promise<void>; hasFiles: () => boolean } | null>(null)
  const [hasFilesSelected, setHasFilesSelected] = useState(false)

  // Wrapper for handling commitment decisions that manages modal state
  const handleCommitmentDecisionWrapper = async (taskId: string, decision: 'commit_now' | 'commit_after_appraisal', commitmentData?: CommitmentData) => {
    if (decision === 'commit_now' && !commitmentData) {
      // Open modal to get commitment details
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        setCurrentCommitmentTask(task)
        setShowCommitmentModal(true)
        return
      }
    }

    // Process the decision with the original handler
    if (handleCommitmentDecision) {
      await handleCommitmentDecision(taskId, decision, commitmentData)
    }
  }

  const handleCommitmentCreate = async (commitment: {
    type: 'dollar' | 'percentage'
    amount: number
    message?: string
  }) => {
    if (currentCommitmentTask) {
      const commitmentData = {
        ...commitment,
        createdAt: new Date().toISOString()
      }
      
      // Check if this is the conditional equity commitment task (step 8)
      if (currentCommitmentTask.title === 'Donor: Makes Equity Commitment') {
        // For step 8, we just complete the task with the commitment data
        setCompletingTasks(prev => new Set(prev).add(currentCommitmentTask.id))
        try {
          await completeTask(currentCommitmentTask.id, commitmentData)
        } catch {
          // Error will be handled by the completion flow
        } finally {
          setCompletingTasks(prev => {
            const newSet = new Set(prev)
            newSet.delete(currentCommitmentTask.id)
            return newSet
          })
        }
      } else if (handleCommitmentDecision) {
        // For step 2, use the commitment decision handler
        await handleCommitmentDecision(currentCommitmentTask.id, 'commit_now', commitmentData)
      }
      
      setShowCommitmentModal(false)
      setCurrentCommitmentTask(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gradient-to-r from-gray-50 via-white to-gray-50 rounded-2xl shadow-sm border border-gray-100"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Filter tasks based on user role if not showing all tasks
  const filteredTasks = showAllTasks
    ? tasks
    : tasks.filter(task => {
        // For appraisers, show tasks assigned to their role (including null assignedTo)
        if ((customClaims?.role as string) === 'appraiser') {
          return (task.assignedRole as string) === 'appraiser' ||
                 task.assignedTo === user?.uid ||
                 (task.assignedTo?.startsWith?.('mock-') && (task.assignedRole as string) === 'appraiser')
        }
        // For donors, show all tasks so they can see the entire workflow (donor, appraiser, nonprofit)
        if ((customClaims?.role as string) === 'donor') {
          return true
        }
        // For other roles, check direct assignment or role match
        return task.assignedTo === user?.uid || task.assignedRole === customClaims?.role
      })


  // Sort tasks by order field to maintain consistent workflow sequence
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Use order field if available, otherwise fall back to createdAt for older tasks
    if (a.order && b.order) {
      return a.order - b.order
    }
    // Fallback to creation date for backwards compatibility
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
    return aTime - bTime
  })

  const handleCompleteTask = async (taskId: string) => {
    if (completingTasks.has(taskId)) return

    // Check if this is an invitation task
    const task = tasks.find(t => t.id === taskId)
    if (task?.type === 'invitation') {
      setShowInvitationModal(true)
      return
    }
    
    // Check if this is a document upload task
    if (task?.type === 'document_upload') {
      setCurrentUploadTask(task)
      setShowUploadModal(true)
      return
    }
    
    // Check if this is a DocuSign signature task
    if (task?.type === 'docusign_signature') {
      handleDocuSignTask(taskId)
      return
    }
    
    // Check if this is the conditional equity commitment task (step 8)
    // This is different from step 2 commitment decision - it's for making the actual commitment
    if (task?.type === 'commitment_decision' && task?.title === 'Donor: Makes Equity Commitment') {
      setCurrentCommitmentTask(task)
      setShowCommitmentModal(true)
      return
    }
    

    setCompletingTasks(prev => new Set(prev).add(taskId))
    
    try {
      await completeTask(taskId)
    } catch {
      // Handle error - could show toast notification
    } finally {
      setCompletingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const handleInvitationSuccess = () => {
    setShowInvitationModal(false)
    // The useDonationTasks hook should automatically refresh and show the task as completed
  }
  
  const handleUploadSuccess = async (file: File, folder: string) => {
    try {
      await uploadFile(file, folder as 'legal' | 'financial' | 'appraisals' | 'signed-documents' | 'general')
      // After all files are uploaded, close modal and mark task complete
      setShowUploadModal(false)
      setCurrentUploadTask(null)
      setHasFilesSelected(false)
      // Mark the upload task as completed
      if (currentUploadTask) {
        await completeTask(currentUploadTask.id)
      }
    } catch (error) {
      // Error will be handled by the upload component
      throw error
    }
  }

  const handleAppraisalMethodSelect = async (taskId: string, method: 'invite_appraiser' | 'ai_appraisal') => {
    try {
      if (method === 'ai_appraisal') {
        // For AI Appraisal, we need to convert the invitation task to an ai_appraisal_request task
        // This allows the AIAppraisalForm to submit to the correct API endpoint
        const response = await fetch(`/api/tasks/${taskId}/convert-to-ai-appraisal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user?.getIdToken()}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to convert task for AI Appraisal')
        }
      } else {
        // For invite appraiser, complete the task with the method selection
        await completeTask(taskId, {
          appraisalMethod: method
        })
      }
    } catch (error) {
      // Error will be handled by the parent component
      throw error
    }
  }
  
  const handleDocuSignTask = async (taskId: string) => {
    if (docuSignLoading) return
    
    setDocuSignLoading(true)
    
    try {
      const token = await user?.getIdToken()
      
      // Create DocuSign envelope
      const envelopeResponse = await fetch('/api/docusign/create-envelope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          signerEmail: user?.email,
          signerName: user?.displayName || user?.email?.split('@')[0] || 'User',
          donationId: effectiveId,
          documentName: 'General NDA',
          emailSubject: 'Please sign the General NDA for your donation'
        })
      })
      
      const envelopeResult = await envelopeResponse.json()
      
      if (!envelopeResponse.ok) {
        throw new Error(envelopeResult.error || 'Failed to create DocuSign envelope')
      }
      
      // Get signing URL for embedded signing
      const signingResponse = await fetch('/api/docusign/signing-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          envelopeId: envelopeResult.envelopeId,
          recipientEmail: user?.email,
          recipientName: user?.displayName || user?.email?.split('@')[0] || 'User',
          donationId: effectiveId
        })
      })
      
      const signingResult = await signingResponse.json()
      
      if (!signingResponse.ok) {
        throw new Error(signingResult.error || 'Failed to get signing URL')
      }
      
      // Open DocuSign signing interface in new window
      const signingWindow = window.open(
        signingResult.signingUrl,
        'docusign-signing',
        'width=800,height=600,scrollbars=yes,resizable=yes'
      )
      
      // Check if signing is complete periodically
      const checkSigning = setInterval(async () => {
        if (signingWindow?.closed) {
          clearInterval(checkSigning)
          // Check envelope status to see if it was signed
          try {
            const statusResponse = await fetch(`/api/docusign/envelope-status?envelopeId=${envelopeResult.envelopeId}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            
            const statusResult = await statusResponse.json()
            
            if (statusResponse.ok && statusResult.status === 'completed') {
              // Mark task as completed
              await completeTask(taskId)
            }
          } catch {
            // Error checking envelope status
          }
        }
      }, 2000)
      
      // Clean up interval after 5 minutes
      setTimeout(() => clearInterval(checkSigning), 300000)
      
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to initiate document signing')
    } finally {
      setDocuSignLoading(false)
    }
  }
  

  const handleRefreshTasks = async () => {
    if (refreshing || !effectiveId) return

    setRefreshing(true)

    try {
      const token = await user?.getIdToken()

      const response = await fetch('/api/tasks/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ participantId: effectiveId })
      })

      if (!response.ok) {
        throw new Error('Failed to refresh tasks')
      }

      await response.json()
      
      // The real-time listener should pick up any changes automatically
      // This is just to force a server-side check
      
    } catch {
      alert('Failed to refresh tasks')
    } finally {
      setRefreshing(false)
    }
  }

  const handleResetTasks = () => {
    if (resettingTasks) return
    setShowResetModal(true)
  }

  const confirmResetTasks = async () => {
    setShowResetModal(false)
    setResettingTasks(true)

    try {
      const token = await user?.getIdToken()

      let response

      // Use effectiveId for reset
      if (effectiveId) {
        // Try participant-based reset first (new structure)
        response = await fetch(`/api/campaign-participants/${effectiveId}/reset-tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      } else if (tasks.length > 0) {
        // Fallback: get ID from tasks
        if (tasks[0].donationId) {
          response = await fetch(`/api/donations/${tasks[0].donationId}/reset-tasks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })
        } else if (tasks[0].participantId) {
          response = await fetch(`/api/campaign-participants/${tasks[0].participantId}/reset-tasks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })
        } else {
          throw new Error('No donation or participant ID available to reset tasks')
        }
      } else {
        throw new Error('No donation or participant ID available to reset tasks')
      }

      if (!response.ok) {
        let errorMessage = 'Failed to reset tasks'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If response is not JSON (like HTML), use status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      await response.json()

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reset tasks')
    } finally {
      setResettingTasks(false)
    }
  }

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'blocked':
        return <Lock className="h-5 w-5 text-gray-400" />
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/70 shadow-sm hover:shadow-md'
      case 'in_progress':
        return 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/70 shadow-sm hover:shadow-md'
      case 'blocked':
        return 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200/70 shadow-sm'
      case 'pending':
        return 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200/70 shadow-sm hover:shadow-md'
      default:
        return 'bg-gradient-to-br from-white to-gray-50 border-gray-200/70 shadow-sm hover:shadow-md'
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'donor':
        return 'Donor Tasks'
      case 'nonprofit_admin':
        return 'Nonprofit Tasks'
      case 'appraiser':
        return 'Appraiser Tasks'
      default:
        return `${role} Tasks`
    }
  }

  const getBlockingTaskInfo = (task: Task) => {
    if (task.status !== 'blocked' || !task.dependencies || task.dependencies.length === 0) {
      return null
    }

    // Find the first blocking task (the one that needs to be completed)
    const blockingTaskId = task.dependencies[0]
    const blockingTask = tasks.find(t => t.id === blockingTaskId)

    if (!blockingTask) {
      return null
    }

    // Get the role name for display
    const roleName = blockingTask.assignedRole === 'donor' ? 'Donor' :
                     blockingTask.assignedRole === 'nonprofit_admin' ? 'Nonprofit' :
                     blockingTask.assignedRole === 'appraiser' ? 'Appraiser' :
                     blockingTask.assignedRole

    return {
      role: roleName,
      taskTitle: blockingTask.title
    }
  }

  const canCompleteTask = (task: Task) => {
    if (task.status === 'completed' || task.status === 'blocked') {
      return false
    }

    // Direct assignment to the user
    if (task.assignedTo === user?.uid) {
      return true
    }

    // Mock user assignment
    if (task.assignedTo?.startsWith('mock-') && task.assignedRole === customClaims?.role) {
      return true
    }

    // Role-based assignment (especially for appraiser tasks with null assignedTo)
    if (task.assignedRole === customClaims?.role && (task.assignedTo === null || task.assignedTo === undefined)) {
      return true
    }

    return false
  }


  // Tasks should always exist since they're created automatically with donations
  if (filteredTasks.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md border border-gray-100/50 p-6">
        <div className="text-center text-gray-500">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading tasks...</h3>
          <p className="text-sm text-gray-600">Your donation tasks are being loaded.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          {showAllTasks ? 'Donation Workflow Tasks' : 'Your Tasks'}
        </h2>
        <div className="flex items-center space-x-3">
          <div className="px-2 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full border border-blue-100">
            <span className="text-xs font-medium text-blue-700">
              {sortedTasks.filter(t => t.status === 'completed').length} of {sortedTasks.length} completed
            </span>
          </div>
          {/* Refresh button */}
          <Button
            onClick={handleRefreshTasks}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200 hover:bg-blue-50 rounded-xl transition-all duration-200"
          >
            {refreshing ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
          {/* Reset button - only show for donors */}
          {customClaims?.role === 'donor' && (
            <Button
              onClick={handleResetTasks}
              disabled={resettingTasks}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl transition-all duration-200"
            >
              {resettingTasks ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Tasks
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {sortedTasks.map((task, index) => {
          // Special rendering for commitment decision tasks
          // Only render CommitmentDecisionTask for step 2 (Commitment Decision)
          // Step 8 (Makes Equity Commitment) is handled as a regular task
          if (task.type === 'commitment_decision' && handleCommitmentDecision && task.title !== 'Donor: Makes Equity Commitment') {
            return (
              <div key={task.id} className="group">
                <CommitmentDecisionTask
                  task={task}
                  onDecision={handleCommitmentDecisionWrapper}
                  campaignTitle={campaignTitle}
                  donorName={donorName || 'Anonymous Donor'}
                  organizationName={organizationName || 'Organization'}
                  stepNumber={index + 1}
                />
              </div>
            )
          }

          // Special rendering for invitation tasks that are appraisal-related
          // Check if this is an appraiser invitation task that should show method options
          if (task.type === 'invitation' && task.title.toLowerCase().includes('appraiser')) {
            return (
              <div key={task.id} className="group">
                <AppraisalMethodTask
                  task={task}
                  onMethodSelect={handleAppraisalMethodSelect}
                  campaignTitle={campaignTitle}
                  donorName={donorName}
                  organizationName={organizationName}
                  stepNumber={index + 1}
                />
              </div>
            )
          }

          return (
            <div key={task.id} className="group">
              <div className={`p-4 rounded-xl transition-all duration-300 ${getStatusColor(task.status)}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white mb-2 shadow-md">
                      {index + 1}
                    </div>
                    <div className="p-1 rounded-full bg-white/80 shadow-sm">
                      {getStatusIcon(task.status)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-base font-bold text-gray-900">
                        {task.title}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shadow-sm ${
                        task.assignedRole === 'donor' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800' :
                        task.assignedRole === 'nonprofit_admin' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800' :
                        'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800'
                      }`}>
                        {getRoleDisplayName(task.assignedRole).replace(' Tasks', '')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2 leading-relaxed">
                      {task.description}
                    </p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="flex items-center bg-white/60 px-2 py-1 rounded-full">
                        <span className="text-gray-600">Priority:</span>
                        <span className={`ml-1 font-semibold ${
                          task.priority === 'high' ? 'text-red-600' :
                          task.priority === 'medium' ? 'text-amber-600' :
                          'text-emerald-600'
                        }`}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      </span>
                      {task.status === 'blocked' && (() => {
                        const blockingInfo = getBlockingTaskInfo(task)
                        return (
                          <span className="flex items-center text-gray-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                            <Lock className="w-3 h-3 mr-1" />
                            {blockingInfo
                              ? `Waiting for ${blockingInfo.role} to complete their task`
                              : 'Waiting for previous task'}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>
                
                <div className="ml-4">
                  {canCompleteTask(task) ? (
                    <div className="flex flex-col gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => handleCompleteTask(task.id)}
                        disabled={completingTasks.has(task.id)}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg px-4 py-2"
                      >
                        {completingTasks.has(task.id) ? (
                          <>
                            <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            Completing...
                          </>
                        ) : task.type === 'invitation' ? (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Invitation
                          </>
                        ) : task.type === 'document_upload' ? (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Documents
                          </>
                        ) : task.type === 'docusign_signature' ? (
                          <>
                            <FileSignature className="h-4 w-4 mr-2" />
                            {docuSignLoading ? 'Preparing...' : 'Sign Document'}
                          </>
                        ) : (
                          <>
                            Complete Task
                            {/* Debug: Show task type */}
                            <span className="ml-1 text-xs opacity-50">({task.type})</span>
                          </>
                        )}
                      </Button>
                      
                      {/* Development: Manual completion button for DocuSign tasks */}
                      {task.type === 'docusign_signature' && process.env.NODE_ENV === 'development' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (confirm('Download and store signed document? This will mark the task as complete. (Development only)')) {
                              setCompletingTasks(prev => new Set(prev).add(task.id))
                              try {
                                // Use the development-specific endpoint that downloads the document
                                const response = await fetch(`/api/tasks/${task.id}/complete-docusign-dev`, {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${await user?.getIdToken()}`,
                                    'Content-Type': 'application/json'
                                  }
                                })

                                if (!response.ok) {
                                  const error = await response.json()
                                  throw new Error(error.error || 'Failed to complete task')
                                }

                                await response.json()
                                
                                // Tasks will refresh automatically via Firestore listener
                              } catch (error) {
                                alert('Failed to complete task: ' + (error instanceof Error ? error.message : 'Unknown error'))
                              } finally {
                                setCompletingTasks(prev => {
                                  const newSet = new Set(prev)
                                  newSet.delete(task.id)
                                  return newSet
                                })
                              }
                            }
                          }}
                          disabled={completingTasks.has(task.id)}
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all duration-200"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {completingTasks.has(task.id) ? 'Processing...' : 'Download & Complete'}
                        </Button>
                      )}
                    </div>
                  ) : task.status === 'completed' ? (
                    <div className="flex items-center bg-gradient-to-r from-emerald-50 to-green-50 px-3 py-2 rounded-lg shadow-sm border border-emerald-200">
                      <CheckCircle className="h-4 w-4 mr-1.5 text-emerald-600" />
                      <span className="text-emerald-700 font-medium text-sm">Completed</span>
                    </div>
                  ) : task.status === 'blocked' ? (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                        <Lock className="h-4 w-4 mr-1.5 text-amber-600" />
                        <span className="text-amber-700 font-medium text-sm">Blocked</span>
                      </div>
                      {(() => {
                        const blockingInfo = getBlockingTaskInfo(task)
                        if (blockingInfo) {
                          return (
                            <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                              Waiting for {blockingInfo.role}
                            </span>
                          )
                        }
                        return null
                      })()}
                    </div>
                  ) : (
                    <div className="px-3 py-2 bg-white/60 rounded-lg">
                      <span className="text-xs text-gray-600 font-medium">
                        Assigned to {getRoleDisplayName(task.assignedRole).replace(' Tasks', '')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      {/* Invitation Modal */}
      {showInvitationModal && (
        <Modal
          isOpen={showInvitationModal}
          onClose={() => setShowInvitationModal(false)}
          title="Invite Appraiser to Platform"
          size="md"
        >
          <AppraiserInvitationForm
            participantId={effectiveId}
            donationId={effectiveId}
            onSuccess={handleInvitationSuccess}
          />
        </Modal>
      )}
      
      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={currentUploadTask?.title || 'Upload Documents'}
        size="lg"
      >
        <div className="space-y-6">
          <p className="text-gray-600 leading-relaxed">
            {currentUploadTask?.description}
          </p>
          <FileUpload
            onUpload={handleUploadSuccess}
            className="max-h-96 overflow-y-auto"
            showUploadButton={false}
            ref={fileUploadRef}
            onFilesChange={setHasFilesSelected}
          />
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <Button
              onClick={() => {
                setShowUploadModal(false)
                setCurrentUploadTask(null)
                setHasFilesSelected(false)
              }}
              variant="outline"
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={() => fileUploadRef.current?.triggerUpload()}
              disabled={!hasFilesSelected}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6 py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload & Complete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Equity Commitment Modal */}
      <EquityCommitmentModal
        isOpen={showCommitmentModal}
        onClose={() => {
          setShowCommitmentModal(false)
          setCurrentCommitmentTask(null)
        }}
        onCommit={handleCommitmentCreate}
        campaignTitle={campaignTitle || 'this campaign'}
        donorName={donorName || 'Anonymous Donor'}
        organizationName={organizationName || 'Organization'}
      />

      {/* Reset Tasks Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Task List"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to reset the task list?
          </p>
          <div className="flex gap-3 justify-end pt-4">
            <Button
              onClick={() => setShowResetModal(false)}
              variant="outline"
              disabled={resettingTasks}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmResetTasks}
              disabled={resettingTasks}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {resettingTasks ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Resetting...
                </>
              ) : (
                'Reset'
              )}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}