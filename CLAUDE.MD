# Equity Donation Platform - Development Guide

## Project Overview
Next.js/TypeScript platform enabling pre-committed equity donations to nonprofits upon liquidity events. Features campaign creation, donor commitments, and appraisal workflows via shared task lists.

## Tech Stack
- **Frontend**: Next.js 14+ with TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Storage, Functions)
- **Auth**: Firebase Auth with custom claims (RBAC)
- **Documents**: DocuSign API integration

## User Roles
1. **Donors** - Create equity commitments upon liquidity events
2. **Nonprofit Admins** - Create campaigns, manage donations, coordinate workflows
3. **Appraisers** - Conduct valuations, submit appraisal documents

## Core Features (MVP)

### Authentication & Authorization ✅
- Firebase Auth with custom claims & RBAC
- Split-screen professional UI following Equity Compass styling
- Multi-step registration with organization management
- Protected routes with granular permissions

### Campaign Management ✅
- Campaign creation with visibility controls (public/private/unlisted)
- Full-featured browse page with filtering & search
- Real-time progress tracking & statistics
- Categories: Technology, Education, Healthcare, Environment, Arts & Culture, Community, Social Impact, Research, Emergency Relief

### Invitation System ✅
- Token-based campaign invitations
- Contextual landing with welcome messaging
- Personal messages from inviters
- Professional success/error states

### Donation Workflow ✅
- Streamlined donation process (no anonymous donations)
- Role-based navigation & context preservation
- Auto campaign statistics sync

### 7-Step Task System ✅
- Sequential workflow with dependencies
- Universal visibility for transparency
- Role-based completion rights
- Real-time updates with color-coded badges

## Development Standards
- **Code**: TypeScript strict mode, ESLint/Prettier, comprehensive error handling
- **Security**: Production-ready Firestore rules, least privilege access, XSS/CSRF protection
- **Performance**: Next.js App Router, image optimization, lazy loading, Firebase query optimization
- **Quality**: No temporary fixes - production-ready code from start

## 7-Step Task Workflow
1. **Donor**: Provide Company Information
2. **Appraiser**: Initial Equity Assessment
3. **Donor**: Review Initial Assessment
4. **Appraiser**: Conduct Equity Appraisal
5. **Nonprofit**: Process Donation Request
6. **Donor**: Review Final Documentation
7. **Nonprofit**: Finalize Donation Receipt

**Features**: Auto-creation, sequential dependencies, universal visibility, role-based completion, real-time updates, professional UI with color-coded badges

## Firebase Architecture

### Collections
- **campaigns**: title, description, goal, status, visibility, category, organizationId
- **users**: profile, role, organizationId
- **organizations**: name, type, adminIds[]
- **donations**: campaignId, donorId, amount, status, requiresAppraisal
- **tasks**: donationId, assignedRole, status, dependencies[], metadata
- **campaign_invitations**: campaignId, inviterUserId, invitationToken, status

### Custom Claims
```typescript
interface CustomClaims {
  role: 'donor' | 'nonprofit_admin' | 'appraiser' | 'admin';
  organizationId?: string;
  permissions: string[];
}
```

### Storage Structure
```
donations/participants/{participantId}/ - legal/, financial/, appraisals/, signed-documents/, general/
shared/{campaignId}/ - campaign-materials/
donations/{donationId}/ - legacy structure (maintained for backward compatibility)
```

## API Integration
- **DocuSign**: Use eSignature REST API v2.1+, webhooks, envelope tracking
- **General**: Search latest docs, error handling, env vars, rate limiting, logging

## Security Rules (Production-Ready)

### Firestore
- Users: Own profile only
- Campaigns: Read all, create (nonprofit_admin), update (creator/admin)
- Donations: Participants only (donor/nonprofit/appraiser/admin)

### Storage
- Donations folder: Participants only + admin access

## Development Workflow
- **Git**: Commit changes immediately, conventional commits, atomic commits
- **Documentation**: Update claude.md after architectural changes
- **Quality**: No temporary fixes - production-ready code only
- **Testing**: Automated pipeline, security audits, monitoring

## Environment Variables
```env
# Firebase Public
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Firebase Private
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# DocuSign
DOCUSIGN_INTEGRATION_KEY=
DOCUSIGN_USER_ID=
DOCUSIGN_ACCOUNT_ID=

# App
NODE_ENV=
NEXT_PUBLIC_APP_URL=
```

## Styling Guide

### Design System
Professional, trustworthy design optimized for financial platforms prioritizing clarity, accessibility, and user confidence.

### Colors
- **Primary**: `blue-600` (#2563eb) with `blue-700` hover
- **Text**: `gray-900` (headings), `gray-700` (body), `gray-500` (muted)
- **Backgrounds**: `white` (content), `gray-50` (sections)
- **Success/Error**: `green-600`/`red-600` with light backgrounds

### Typography
- **Font**: Inter (Google Fonts) with system fallbacks
- **Scale**: text-6xl (hero) → text-base (body) → text-xs (captions)
- **Weights**: 400 (body), 500 (labels), 600 (buttons), 700 (headings), 800 (hero)

### Components
- **Buttons**: Primary (blue-600), Secondary (white+border), Outline, Ghost styles
- **Cards**: White bg, gray-200 border, rounded-lg, hover shadow
- **Forms**: Input fields with focus states, labels, error handling
- **Layout**: Container system with responsive breakpoints

### Key Classes
- **Buttons**: `px-6 py-3 rounded-lg font-semibold transition-all duration-200`
- **Cards**: `bg-white border border-gray-200 rounded-lg shadow-sm`
- **Inputs**: `px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500`
- **Focus**: `focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`

### Standards
- Semantic HTML elements, proper heading hierarchy
- ARIA labels, screen reader support
- Mobile-first responsive design
- Hover states on interactive elements
- Loading states and error boundaries

## Development Notes
- **Security**: Enterprise standards, latest API docs, comprehensive error handling
- **Code**: TypeScript strict mode (no `any`), Next.js best practices, WCAG 2.1 AA
- **Performance**: Firebase optimization, proper loading states, scalable architecture
- **Styling**: Follow Donate Equity styling guide exactly

## Authentication System

### Architecture
Firebase Auth with custom claims for RBAC, split-screen professional UI, protected routes with granular permissions.

### Components
- **AuthContext**: Global auth state, user profiles, custom claims, token refresh
- **AuthLayout**: Split-screen design (dark left panel, clean forms right)
- **ProtectedRoute**: Role-based protection with convenience wrappers

### Flow
1. **Registration**: Role selection → personal details → organization setup → account creation
2. **Login**: Email/password → profile loading → route protection → session management

### Permissions
- **Donor**: create_donation, view_own_donations, manage_own_profile
- **Nonprofit**: create_campaign, manage_campaigns, view_donations, manage_organization
- **Appraiser**: view_assigned_tasks, submit_appraisals, manage_own_profile

## Recent Updates ✅

### Core Features Completed
- **7-Step Task System**: Auto-creation, sequential dependencies, role-based completion, real-time updates
- **Donation Workflow**: Streamlined process, removed anonymous donations, role-based navigation
- **Campaign System**: Browsing, invitations with context, statistics sync
- **Authentication**: Enhanced UI/UX, professional containers, improved accessibility

### Key Files
- `/app/api/donations/create/route.ts` - Task creation API
- `/components/tasks/DonationTaskList.tsx` - Task UI
- `/hooks/useDonationTasks.ts` - Real-time task management
- `/app/donations/[id]/tasks/page.tsx` - Task interface

### Technical Improvements
- Router context fixes, Firestore indexes, security rules updates
- Enhanced loading states, error handling, visual consistency
- Professional form design, mobile accessibility, ARIA labeling