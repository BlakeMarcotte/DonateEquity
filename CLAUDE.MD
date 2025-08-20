# 🚨 CRITICAL: Security & Code Quality Requirements - READ FIRST

## ⛔ MANDATORY SECURITY PRACTICES (ENFORCE ON EVERY CHANGE)

### 1. Authentication & Authorization
- **NEVER** store sensitive data in localStorage or sessionStorage
- **ALWAYS** validate user permissions server-side before data access
- **NEVER** expose API keys, secrets, or sensitive configuration in client code
- **ALWAYS** use Firebase Security Rules to enforce access control at the database level
- **VERIFY** custom claims on both client AND server for every protected operation
- **IMPLEMENT** proper session management with token refresh

### 2. Data Validation & Sanitization  
- **VALIDATE** all user inputs on both client AND server (never trust the client)
- **SANITIZE** all data before storage to prevent XSS attacks
- **ESCAPE** all dynamic content in JSX to prevent injection attacks
- **USE** parameterized queries - never concatenate user input into queries
- **IMPLEMENT** input length limits and type checking
- **REJECT** requests with unexpected fields

### 3. Error Handling & Logging
- **NEVER** use console.log, console.error, console.warn in production code
- **ALWAYS** use secureLogger for all logging needs
- **NEVER** expose sensitive information in error messages (no stack traces, paths, or system details)
- **IMPLEMENT** user-friendly error messages that don't reveal system internals
- **LOG** security events for audit trails
- **CATCH** all promises and handle rejection properly

### 4. API Security
- **AUTHENTICATE** every API route using Firebase Admin SDK
- **VALIDATE** request origins and implement proper CORS policies
- **IMPLEMENT** rate limiting on all endpoints (especially public ones)
- **NEVER** expose internal API structure or database schema
- **USE** HTTPS everywhere - no HTTP allowed
- **VERIFY** webhook signatures for external integrations

### 5. Code Security
- **REVIEW** dependencies for known vulnerabilities (`npm audit`)
- **NEVER** commit secrets, .env files, or sensitive data
- **USE** environment variables for all configuration
- **IMPLEMENT** Content Security Policy (CSP) headers
- **SANITIZE** file uploads and limit file types/sizes
- **PREVENT** SQL injection, NoSQL injection, and command injection

## 📋 MANDATORY CODING PRACTICES (NO SHORTCUTS EVER)

### 1. TypeScript Standards
```typescript
// ❌ NEVER DO THIS
const processData = (data: any) => data.value
let result: any = fetchData()

// ✅ ALWAYS DO THIS
const processData = (data: unknown): string => {
  if (isValidData(data)) return data.value
  throw new Error('Invalid data structure')
}
const result: UserData = await fetchData()
```
- **NO** use of `any` type - use `unknown` with proper type guards
- **ENABLE** strict mode and all strict checks in tsconfig
- **DEFINE** explicit return types for all functions
- **USE** discriminated unions over general types
- **IMPLEMENT** exhaustive type checking

### 2. Component Standards
```typescript
// ❌ NEVER: Business logic in components
export default function UserProfile() {
  const [user, setUser] = useState()
  
  const updateUser = async () => {
    const response = await fetch('/api/user')
    const data = await response.json()
    setUser(data)
  }
}

// ✅ ALWAYS: Separate concerns
export default function UserProfile() {
  const { user, updateUser, loading, error } = useUser()
  
  if (error) return <ErrorBoundary error={error} />
  if (loading) return <LoadingState />
  
  return <UserProfileView user={user} onUpdate={updateUser} />
}
```

### 3. Error Handling Pattern
```typescript
// EVERY component must have proper error handling
export default function PageComponent() {
  return (
    <PageErrorBoundary pageName="Component Name">
      <ActualComponent />
    </PageErrorBoundary>
  )
}

// EVERY async operation must follow this pattern
try {
  const result = await riskyOperation()
  return { success: true, data: result }
} catch (error) {
  secureLogger.error('Operation failed', error, { 
    context: 'relevant info',
    userId: user?.uid 
  })
  return { success: false, error: 'User-friendly message' }
}
```

### 4. API Route Security Pattern
```typescript
// EVERY API route MUST follow this pattern
export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const token = await authenticateRequest(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    // 2. Validate input with Zod
    const body = await request.json()
    const validated = schema.parse(body) // Throws if invalid
    
    // 3. Check permissions
    const hasPermission = await checkUserPermission(token.uid, 'required_permission')
    if (!hasPermission) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    
    // 4. Sanitize data
    const sanitized = sanitizeInput(validated)
    
    // 5. Process request
    const result = await processSecurely(sanitized)
    
    // 6. Audit log
    await auditLog({
      userId: token.uid,
      action: 'action_name',
      resource: result.id,
      ip: request.headers.get('x-forwarded-for')
    })
    
    return NextResponse.json(result)
  } catch (error) {
    secureLogger.error('API Error', error, { 
      endpoint: request.url,
      method: request.method 
    })
    
    // Never expose error details
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
```

### 5. State Management Rules
- **MINIMIZE** client-side state - prefer server state
- **NEVER** store sensitive data in React state
- **USE** proper state management patterns (Context, Zustand)
- **VALIDATE** all state updates before applying
- **IMPLEMENT** optimistic updates with rollback on failure

### 6. Performance Requirements
- **LAZY LOAD** all routes and heavy components
- **OPTIMIZE** all images with Next.js Image component
- **IMPLEMENT** loading states within 100ms
- **PAGINATE** all lists over 20 items
- **DEBOUNCE** search inputs (min 300ms)
- **MEMOIZE** expensive computations

## 🛡️ Security Implementation Checklist

### Before Writing ANY Code
- [ ] What are the security implications?
- [ ] How will I validate all inputs?
- [ ] Are permissions checked server-side?
- [ ] Is sensitive data properly protected?
- [ ] Have I considered rate limiting?

### Before Committing Code
```bash
# Run ALL of these before EVERY commit
npm run build          # Must pass with zero errors
npm run lint           # Must pass with zero errors
npm run typecheck      # Must pass with zero errors
npm audit              # No high/critical vulnerabilities
grep -r "console\." src/  # Must return nothing
grep -r ": any" src/   # Must return nothing or have explanations
```

### Code Review Checklist
1. **Auth**: Is every route properly protected?
2. **Validation**: Are all inputs validated server-side?
3. **Sanitization**: Is user content sanitized?
4. **Errors**: Are errors handled without exposing details?
5. **Types**: No `any` types without explanation?
6. **Logs**: Using secureLogger instead of console?
7. **Secrets**: No hardcoded secrets or keys?

## 🚫 NEVER DO THIS (AUTOMATIC REJECTION)
```typescript
// ❌ Exposed secrets
const API_KEY = "sk_live_1234567890"

// ❌ Console logging
console.log('user data:', userData)

// ❌ Direct database access in components  
const users = await db.collection('users').get()

// ❌ Unvalidated input
const email = request.body.email
await sendEmail(email)

// ❌ Exposed error details
catch (error) {
  return { error: error.stack }
}

// ❌ Any type
const processData = (data: any) => data

// ❌ Missing error boundaries
export default function Page() {
  return <Component />
}

// ❌ Synchronous heavy operations
const filtered = hugeArray.filter(expensiveCheck)

// ❌ Direct DOM manipulation
document.getElementById('id').innerHTML = userInput
```

## ✅ ALWAYS DO THIS (REQUIRED PATTERNS)
```typescript
// ✅ Environment variables
const API_KEY = process.env.API_KEY

// ✅ Secure logging
secureLogger.info('User action', { userId: user.uid, action: 'login' })

// ✅ Service layer pattern
const users = await userService.getUsers(authToken)

// ✅ Validated input with Zod
const schema = z.object({ email: z.string().email() })
const { email } = schema.parse(request.body)

// ✅ Safe error handling
catch (error) {
  secureLogger.error('Operation failed', error)
  return { error: 'Something went wrong. Please try again.' }
}

// ✅ Proper typing
const processData = (data: unknown): ProcessedData => {
  if (!isValidData(data)) throw new Error('Invalid data')
  return processValidData(data)
}

// ✅ Error boundaries
export default function Page() {
  return (
    <PageErrorBoundary pageName="Page">
      <Component />
    </PageErrorBoundary>
  )
}

// ✅ Async operations
const filtered = useMemo(
  () => hugeArray.filter(expensiveCheck),
  [hugeArray]
)

// ✅ Safe rendering
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

---

# Equity Donation Platform - Project Details

## Project Overview
Next.js/TypeScript platform enabling pre-committed equity donations to nonprofits upon liquidity events. Built with enterprise-grade security and code quality standards.

## Tech Stack (Security-First)
- **Frontend**: Next.js 14+ with TypeScript (STRICT MODE ONLY), Tailwind CSS
- **Backend**: Firebase with comprehensive Security Rules
- **Auth**: Firebase Auth with server-verified custom claims (RBAC)
- **Storage**: Firebase Storage with participant-based access control
- **Documents**: DocuSign API with webhook verification
- **Monitoring**: Structured logging with secureLogger

## Security Architecture

### Authentication Flow
1. Client requests authentication
2. Firebase Auth validates credentials
3. Custom claims assigned server-side only
4. Token verified on every API request
5. Permissions checked at database level

### Data Access Control
```typescript
// Pattern for ALL data access
async function accessData(userId: string, resourceId: string) {
  // 1. Verify authentication
  const user = await verifyAuthToken(token)
  
  // 2. Check permissions
  const hasAccess = await checkPermissions(user, resourceId)
  
  // 3. Validate request
  const validated = validateRequest(request)
  
  // 4. Access with security rules
  return await secureDataAccess(validated)
}
```

### Firebase Security Rules Pattern
```javascript
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function hasRole(role) {
      return isAuthenticated() && 
        request.auth.token.role == role;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && 
        request.auth.uid == userId;
    }
    
    function validFields(required, forbidden) {
      return request.resource.data.keys().hasAll(required) &&
        !request.resource.data.keys().hasAny(forbidden);
    }
    
    // Example rule pattern
    match /users/{userId} {
      allow read: if isOwner(userId) || hasRole('admin');
      allow write: if isOwner(userId) && 
        validFields(['name', 'email'], ['role', 'permissions']);
    }
  }
}
```

## Development Workflow

### Pre-Development Checklist
- [ ] Review security implications
- [ ] Plan validation strategy
- [ ] Design error handling
- [ ] Consider rate limiting
- [ ] Plan audit logging

### During Development
- [ ] Use TypeScript strict mode
- [ ] Implement error boundaries
- [ ] Add loading states
- [ ] Validate all inputs
- [ ] Use secureLogger only
- [ ] Write secure API routes
- [ ] Test error scenarios

### Pre-Commit Requirements
1. **Build**: `npm run build` (zero errors)
2. **Lint**: `npm run lint` (zero errors)
3. **Type Check**: `npm run typecheck` (zero errors)
4. **Security Audit**: `npm audit` (no high/critical)
5. **Console Check**: No console statements
6. **Any Check**: No `any` types without docs
7. **Test**: All tests passing

## Summary
**🔴 SECURITY and CODE QUALITY are NON-NEGOTIABLE. Every line of code must meet enterprise standards. No exceptions, no shortcuts, no "we'll fix it later". If it's not secure and properly coded, it doesn't get committed.**

---

*The rest of the original documentation (user roles, features, etc.) remains the same but remember: SECURITY FIRST in all implementations.*