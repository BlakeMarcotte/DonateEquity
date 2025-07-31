import { NextRequest, NextResponse } from 'next/server'
import { resend, EMAIL_CONFIG, EMAIL_SUBJECTS } from '@/lib/email/resend'
import { WelcomeEmail } from '@/lib/email/templates/welcome'
import { adminAuth } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    // Get request data
    const {
      userEmail,
      userFirstName,
      userRole,
    } = await request.json()

    // Validate required fields
    if (!userEmail || !userFirstName || !userRole) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: userEmail,
      reply_to: EMAIL_CONFIG.replyTo,
      subject: EMAIL_SUBJECTS.welcome,
      react: WelcomeEmail({
        userFirstName,
        userRole,
      }),
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      emailId: data?.id,
      message: 'Welcome email sent successfully'
    })
  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}