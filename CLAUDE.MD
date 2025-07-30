# Equity Donation Platform - Development Guide

## Project Overview
A Next.js/TypeScript application enabling donors to pre-commit equity donations to nonprofits upon liquidity events. The platform facilitates campaign creation, donor commitments, and manages the appraisal/documentation workflow through shared task lists.

## Tech Stack
- **Frontend**: Next.js 14+ with TypeScript
- **Backend**: Firebase (Firestore, Authentication, Storage, Functions)
- **Authentication**: Firebase Auth with custom claims for role-based access
- **Document Management**: DocuSign API integration
- **File Storage**: Firebase Storage with enterprise-level security
- **Styling**: Tailwind CSS (recommended for rapid development)

## MVP User Roles
1. **Donors** - Create commitments to donate equity upon liquidity events
2. **Nonprofit Admins** - Create campaigns, manage donations, coordinate workflows
3. **Appraisers** - Conduct valuations, submit appraisal documents

## Core Features (MVP)

### Authentication & Authorization
- Firebase Authentication with custom claims
- Role-based access control (RBAC)
- Enterprise-level Firestore security rules
- Secure storage bucket access rules

### Campaign Management
- Nonprofits create campaigns with monetary goals
- Campaign visibility and discovery
- Real-time progress tracking

### Donation Workflow
- Donors browse and commit to campaigns
- Pre-commitment system for future liquidity events
- Shared task list creation upon donation initiation

### Shared Task System
- Dynamic task lists between Donor, Nonprofit Admin, and Appraiser
- Document signing workflow via DocuSign
- File sharing through secure storage buckets
- Task completion tracking and notifications

### Document & File Management
- Secure document storage in Firebase Storage
- Organized folder structure per donation/campaign
- DocuSign integration for appraisal documents
- Version control and audit trails

## Development Standards

### Code Quality
- TypeScript strict mode enabled
- ESLint + Prettier configuration
- Comprehensive error handling
- Input validation and sanitization
- Unit and integration testing

### Security Standards
- Production-ready Firestore rules from day one
- Principle of least privilege for all access
- Input sanitization and XSS prevention
- CSRF protection
- Secure API key management
- Audit logging for sensitive operations

### Performance
- Next.js App Router for optimal performance
- Image optimization
- Lazy loading and code splitting
- Firebase query optimization
- Caching strategies

## Firebase Architecture

### Firestore Collections Structure
```
campaigns/
  {campaignId}/
    - title, description, goal, createdBy, status
    - subcollections: donations/, tasks/

users/
  {userId}/
    - profile data, role, organizationId

organizations/
  {orgId}/
    - nonprofit/appraiser organization data

donations/
  {donationId}/
    - campaignId, donorId, amount, status, commitmentDetails
    - subcollections: tasks/, documents/

tasks/
  {taskId}/
    - assignedTo, type, status, dependencies, dueDate

documents/
  {docId}/
    - type, storageUrl, signatureStatus, uploadedBy
```

### Custom Claims Structure
```typescript
interface CustomClaims {
  role: 'donor' | 'nonprofit_admin' | 'appraiser' | 'admin';
  organizationId?: string;
  permissions: string[];
}
```

### Storage Bucket Structure
```
donations/{donationId}/
  legal/
  financial/
  appraisals/
  signed-documents/
shared/{campaignId}/
  campaign-materials/
```

## API Integration Guidelines

### DocuSign Integration
- **Always search for latest DocuSign API documentation** before implementation
- Use DocuSign eSignature REST API v2.1+
- Implement webhook handlers for status updates
- Store envelope IDs in Firestore for tracking
- Handle signature completion workflows

### External API Best Practices
- **Search internet for most recent API documentation** for all integrations
- Implement proper error handling and retry logic
- Use environment variables for API keys
- Rate limiting and request throttling
- Comprehensive logging for API interactions

## Security Rules Templates

### Firestore Rules (Production-Ready)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Campaign access based on role
    match /campaigns/{campaignId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.auth.token.role == 'nonprofit_admin';
      allow update: if request.auth != null && 
        (resource.data.createdBy == request.auth.uid || 
         request.auth.token.role == 'admin');
    }
    
    // Donation access - participants only
    match /donations/{donationId} {
      allow read, write: if request.auth != null && 
        (resource.data.donorId == request.auth.uid ||
         resource.data.nonprofitAdminId == request.auth.uid ||
         resource.data.appraiserId == request.auth.uid ||
         request.auth.token.role == 'admin');
    }
  }
}
```

### Storage Rules (Production-Ready)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /donations/{donationId}/{allPaths=**} {
      allow read, write: if request.auth != null && 
        (isParticipant(donationId) || 
         request.auth.token.role == 'admin');
    }
  }
  
  function isParticipant(donationId) {
    return exists(/databases/$(database)/documents/donations/$(donationId)) &&
           (get(/databases/$(database)/documents/donations/$(donationId)).data.donorId == request.auth.uid ||
            get(/databases/$(database)/documents/donations/$(donationId)).data.nonprofitAdminId == request.auth.uid ||
            get(/databases/$(database)/documents/donations/$(donationId)).data.appraiserId == request.auth.uid);
  }
}
```

## Version Control & Documentation Management

### Git Workflow
- **Always commit changes to GitHub** after implementing features or fixes
- Use descriptive commit messages following conventional commits format
- Create branches for significant features and merge via pull requests
- Maintain clean commit history with atomic commits

### Claude.md File Management
- **Update this claude.md file immediately** after making any architectural changes
- Document new features, API integrations, or structural modifications
- Keep the file synchronized with the actual codebase state
- Include any new environment variables, dependencies, or configuration changes
- Update security rules, data models, and API documentation as they evolve
- Track major decisions and their rationale for future reference

### Commit Message Format
```
type(scope): description

Examples:
feat(auth): implement role-based access control
fix(docusign): resolve webhook signature verification
docs(claude): update firebase security rules documentation
refactor(storage): optimize file organization structure
```

## Future Expansion (Post-MVP)
- Attorney role integration
- Financial Professional workflows
- Community Foundation Member features
- Advanced campaign analytics
- Mobile app development

## No Temporary Fixes Policy

**Core Principle**: Never implement temporary solutions or quick fixes. All code must be production-ready from the start.

### Implementation Standards
- **No Workarounds**: Always diagnose and fix root causes using established patterns
- **Industry Standards**: Use proven best practices and design patterns for all implementations
- **Production Quality**: Every line of code must be maintainable, scalable, and enterprise-ready
- **Proper Research**: Investigate and implement established solutions rather than creating custom fixes
- **Long-term Thinking**: Build systems that will scale and remain maintainable over time

### Quality Requirements
- All styling must use proper design system principles
- Components must follow established UI/UX patterns
- Code architecture must be clean and follow industry standards
- Security implementations must be enterprise-grade from day one
- Performance optimizations must be built-in, not retrofitted

### Enforcement
- Review all implementations against industry benchmarks
- Reject any solution that feels like a "quick fix" or temporary measure
- Prioritize doing things correctly over doing them quickly
- Build maintainable systems that future developers can easily understand and extend

## Development Best Practices
- Implement feature flags for gradual rollouts
- Use Git flow branching strategy
- Automated testing pipeline
- Environment-specific configurations
- Comprehensive error monitoring and logging
- Regular security audits and penetration testing

## Environment Variables Template
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Private Firebase Admin
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# DocuSign Configuration
DOCUSIGN_INTEGRATION_KEY=
DOCUSIGN_USER_ID=
DOCUSIGN_ACCOUNT_ID=
DOCUSIGN_BASE_PATH=

# Application Settings
NODE_ENV=
NEXT_PUBLIC_APP_URL=
```

## Donate Equity Styling Guide

### Core Design Philosophy
The Donate Equity platform uses a professional, trustworthy design system optimized for financial platforms. Every styling decision prioritizes clarity, accessibility, and user confidence.

### Color Palette

#### Primary Colors
```css
/* Brand Primary - Professional Blue */
--blue-50: #eff6ff
--blue-100: #dbeafe
--blue-200: #bfdbfe
--blue-300: #93c5fd
--blue-400: #60a5fa
--blue-500: #3b82f6
--blue-600: #2563eb  /* Primary brand color */
--blue-700: #1d4ed8
--blue-800: #1e40af
--blue-900: #1e3a8a

/* Neutral Grays */
--gray-50: #f9fafb   /* Light backgrounds */
--gray-100: #f3f4f6
--gray-200: #e5e7eb
--gray-300: #d1d5db
--gray-400: #9ca3af
--gray-500: #6b7280
--gray-600: #4b5563
--gray-700: #374151  /* Body text */
--gray-800: #1f2937
--gray-900: #111827  /* Headings */

/* Success/Error States */
--green-50: #f0fdf4
--green-600: #16a34a
--red-50: #fef2f2
--red-600: #dc2626
```

#### Semantic Color Usage
- **Primary Actions**: `blue-600` with `blue-700` hover
- **Backgrounds**: `white` for content, `gray-50` for sections
- **Text**: `gray-900` for headings, `gray-700` for body, `gray-500` for muted
- **Borders**: `gray-200` for subtle, `gray-300` for defined
- **Success**: `green-600` with `green-50` background
- **Error**: `red-600` with `red-50` background

### Typography System

#### Font Family
- **Primary**: Inter (Google Fonts)
- **Fallback**: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

#### Font Scale
```css
/* Headings */
text-6xl: 3.75rem   /* Hero headings */
text-5xl: 3rem      /* Page headings */
text-4xl: 2.25rem   /* Section headings */
text-3xl: 1.875rem  /* Sub-section headings */
text-2xl: 1.5rem    /* Card headings */
text-xl: 1.25rem    /* Component headings */
text-lg: 1.125rem   /* Large body text */

/* Body Text */
text-base: 1rem     /* Standard body text */
text-sm: 0.875rem   /* Small text, captions */
text-xs: 0.75rem    /* Extra small text */
```

#### Font Weights
- **Regular**: 400 (body text)
- **Medium**: 500 (labels, navigation)
- **Semibold**: 600 (button text, emphasis)
- **Bold**: 700 (headings, important text)
- **Extrabold**: 800 (hero headings only)

### Component System

#### Button Component
```tsx
// Primary Button (default)
className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"

// Secondary Button
className="inline-flex items-center justify-center px-6 py-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-semibold border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"

// Outline Button
className="inline-flex items-center justify-center px-6 py-3 bg-transparent hover:bg-blue-50 active:bg-blue-100 text-blue-600 font-semibold border border-blue-600 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"

// Ghost Button
className="inline-flex items-center justify-center px-6 py-3 bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"

// Link Button
className="inline-flex items-center justify-center px-2 py-1 bg-transparent hover:bg-blue-50 text-blue-600 font-semibold rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
```

#### Button Sizes
```tsx
// Large Button
className="px-8 py-4 text-lg"

// Default Button  
className="px-6 py-3 text-base"

// Small Button
className="px-4 py-2 text-sm"

// Extra Small Button
className="px-3 py-1.5 text-xs"
```

#### Card Component
```tsx
// Basic Card
className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"

// Card Header
className="px-6 py-4 border-b border-gray-200"

// Card Title
className="text-xl font-bold text-gray-900"

// Card Description
className="text-sm text-gray-500 mt-1"

// Card Content
className="px-6 py-4"

// Card Footer
className="px-6 py-4 border-t border-gray-200 bg-gray-50"
```

#### Form Components
```tsx
// Input Field
className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors duration-200"

// Input Label
className="block text-sm font-medium text-gray-700 mb-2"

// Input Error State
className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors duration-200"

// Helper Text
className="text-sm text-gray-500 mt-1"

// Error Message
className="text-sm text-red-600 mt-1"
```

### Layout Patterns

#### Container System
```tsx
// Page Container
className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl"

// Section Container
className="py-16 sm:py-20 lg:py-24"

// Content Width Limits
className="max-w-4xl mx-auto"  // For text content
className="max-w-6xl mx-auto"  // For feature grids
className="max-w-2xl mx-auto"  // For forms
```

#### Grid Systems
```tsx
// Feature Grid (3 columns)
className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"

// Two Column Layout
className="grid gap-12 lg:grid-cols-2 lg:gap-16"

// Auto-fit Grid
className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
```

### Spacing Scale
```css
/* Standard spacing scale */
space-1: 0.25rem    /* 4px */
space-2: 0.5rem     /* 8px */
space-3: 0.75rem    /* 12px */
space-4: 1rem       /* 16px */
space-5: 1.25rem    /* 20px */
space-6: 1.5rem     /* 24px */
space-8: 2rem       /* 32px */
space-10: 2.5rem    /* 40px */
space-12: 3rem      /* 48px */
space-16: 4rem      /* 64px */
space-20: 5rem      /* 80px */
space-24: 6rem      /* 96px */
```

### Border Radius System
```css
rounded-none: 0px
rounded-sm: 0.125rem    /* 2px */
rounded: 0.25rem        /* 4px */
rounded-md: 0.375rem    /* 6px */
rounded-lg: 0.5rem      /* 8px - Standard for buttons, cards */
rounded-xl: 0.75rem     /* 12px */
rounded-2xl: 1rem       /* 16px */
rounded-3xl: 1.5rem     /* 24px */
rounded-full: 9999px
```

### Shadow System
```css
shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)
```

### Animation & Transitions

#### Standard Transitions
```css
transition-all duration-200 ease-out  /* Default for interactive elements */
transition-colors duration-200        /* For color changes */
transition-shadow duration-200        /* For shadow changes */
transition-transform duration-200     /* For transforms */
```

#### Hover States
```tsx
// Button Hover
hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5

// Card Hover
hover:shadow-md hover:-translate-y-1

// Link Hover
hover:text-blue-700 hover:underline
```

### Accessibility Standards

#### Focus States
```tsx
// Standard Focus Ring
focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2

// Focus Within (for containers)
focus-within:ring-2 focus-within:ring-blue-500

// Focus Visible (keyboard only)
focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
```

#### ARIA Labels and Roles
```tsx
// Button with aria-label
<button aria-label="Create your account to start donating equity">

// Section with aria-labelledby
<section aria-labelledby="features-heading">

// Navigation with role
<nav role="navigation" aria-label="Main navigation">
```

### Responsive Design Patterns

#### Breakpoints (Tailwind defaults)
```css
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X Extra large devices */
```

#### Mobile-First Responsive Classes
```tsx
// Typography responsive
text-3xl sm:text-4xl lg:text-5xl

// Spacing responsive
py-12 sm:py-16 lg:py-20

// Grid responsive
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3

// Flexbox responsive
flex-col sm:flex-row

// Hidden on mobile
hidden sm:block
```

### Component Composition Patterns

#### Hero Section
```tsx
<section className="py-20 sm:py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-8">
        Hero Heading
      </h1>
      <p className="text-lg sm:text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
        Hero description text
      </p>
      <div className="flex flex-col sm:flex-row gap-6 justify-center">
        {/* CTA buttons */}
      </div>
    </div>
  </div>
</section>
```

#### Feature Grid
```tsx
<section className="py-16 sm:py-20 lg:py-24 bg-gray-50">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
        Section Heading
      </h2>
      <p className="text-lg text-gray-600 max-w-3xl mx-auto">
        Section description
      </p>
    </div>
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
      {/* Feature cards */}
    </div>
  </div>
</section>
```

### Global CSS Utilities

#### Custom Scrollbar
```css
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f5f9;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
```

#### Background Patterns
```css
.bg-grid-pattern {
  background-image: radial-gradient(circle, #e2e8f0 1px, transparent 1px);
  background-size: 20px 20px;
}
```

### Performance Guidelines

#### Image Optimization
- Use Next.js `Image` component for all images
- Provide proper `alt` attributes
- Use appropriate `sizes` prop for responsive images
- Prefer WebP format with fallbacks

#### Loading States
```tsx
// Button Loading State
<button disabled className="opacity-50 cursor-not-allowed">
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white">
    {/* Loading spinner */}
  </svg>
  Loading...
</button>
```

#### Skeleton Components
```tsx
// Content Skeleton
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

### Implementation Guidelines

1. **Always use semantic HTML elements** (`header`, `main`, `section`, `article`, `nav`)
2. **Implement proper heading hierarchy** (h1 → h2 → h3)
3. **Include skip links** for keyboard navigation
4. **Use proper ARIA labels** for complex interactions
5. **Test with screen readers** and keyboard navigation
6. **Maintain consistent spacing** using the defined scale
7. **Apply hover states** to all interactive elements
8. **Use proper loading states** for async operations
9. **Implement error boundaries** for robust UX
10. **Follow mobile-first responsive design**

This styling guide provides the complete design DNA for the Donate Equity platform. Every component, color choice, and interaction pattern has been carefully chosen to build trust and confidence with users making important financial decisions.

## Notes for Claude Code Development
- Always prioritize security and follow enterprise standards
- Search for the most recent API documentation when implementing integrations
- Implement comprehensive error handling and logging
- Use TypeScript strictly - no `any` types in production code
- Follow Next.js best practices for performance and SEO
- Ensure all Firebase operations are optimized for cost and performance
- Implement proper loading states and user feedback
- Consider accessibility (WCAG 2.1 AA compliance)
- Plan for scalability from the beginning
- **Follow the Donate Equity Styling Guide exactly** for all UI implementations