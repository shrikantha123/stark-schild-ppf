# PPF Customer Management System - Technical Roadmap

## Executive Summary
Complete roadmap for building a secure admin panel and customer portal for PPF warranty management with Google Sheets integration.

---

## 1. TECHNOLOGY STACK

### Backend
- **Node.js** (v18+) with Express.js - REST API server
- **Google Sheets API v4** - Data storage and retrieval
- **Google OAuth 2.0** - Email verification and authentication
- **JWT (JSON Web Tokens)** - Session management
- **bcrypt** - Password hashing for admin accounts
- **joi** - Data validation
- **rate-limiter** - API rate limiting
- **helmet** - Security headers
- **cors** - CORS management
- **dotenv** - Environment variable management

### Frontend (Admin Panel)
- **React.js** (v18+) with Vite - Build tool
- **TailwindCSS** - Styling
- **React Hook Form** - Form management
- **Zod** - Client-side validation
- **Axios** - HTTP client
- **React Router** - Navigation

### Frontend (Customer Portal)
- **React.js** (v18+) with Vite
- **TailwindCSS** - Styling
- **Google Identity Services** - OAuth integration
- **Axios** - HTTP client
- **React Router** - Navigation

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing
- **Nodemon** - Development server
- **Git** - Version control

---

## 2. GOOGLE SHEETS API SETUP

### Required Google Cloud Console Setup
1. Create Google Cloud Project
2. Enable Google Sheets API
3. Enable Google Identity Platform (for OAuth)
4. Create OAuth 2.0 credentials:
   - **Client ID** - For customer email verification
   - **Client Secret** - For OAuth flow
5. Create Service Account:
   - Download JSON key file
   - Share Google Sheet with service account email
   - Grant Editor permissions

### API Authentication Methods
- **Service Account Authentication** (Admin operations)
  - Used for backend to read/write Google Sheets
  - No user interaction required
  - Secure server-to-server communication
  
- **OAuth 2.0** (Customer verification)
  - Google Sign-In for email verification
  - User consents to share email
  - Token-based authentication

### Google Sheets Structure
```
Sheet: "CustomerData"
Columns:
A: ID (Auto-generated UUID)
B: Car Registration Number (Unique)
C: Email
D: PPF Product
E: Warranty Period
F: Date of Installation
G: Vehicle Model/Type
H: Created At (Timestamp)
I: Updated At (Timestamp)
J: Email Verified (Boolean)
K: Verification Token (For email verification)
```

---

## 3. SECURITY ARCHITECTURE

### Authentication Layers
1. **Admin Panel Authentication**
   - Username/password login
   - JWT tokens with 1-hour expiration
   - Refresh token mechanism
   - Role-based access control (RBAC)

2. **Customer Portal Authentication**
   - Google OAuth 2.0 flow
   - Email verification required
   - JWT tokens with 30-minute expiration
   - Car registration number as lookup key

### Security Measures
- **HTTPS Only** - All communications encrypted
- **CORS Configuration** - Whitelist allowed origins
- **Rate Limiting** - Prevent brute force attacks
  - 100 requests per minute per IP
  - 5 login attempts per 15 minutes
- **Input Sanitization** - Prevent SQL injection (though using Sheets API)
- **XSS Protection** - Content Security Policy headers
- **CSRF Protection** - Token-based CSRF protection
- **Environment Variables** - Never commit secrets
- **API Key Rotation** - Regular credential updates
- **Audit Logging** - Log all data access/modifications

### Data Protection
- **Email Hashing** - Store hashed emails for privacy
- **Car Registration Masking** - Partial display in logs
- **Data Minimization** - Only collect necessary data
- **GDPR Compliance** - Data deletion capabilities

---

## 4. DATA VALIDATION STRATEGY

### Backend Validation (Joi Schemas)
```javascript
// Customer Data Schema
const customerSchema = Joi.object({
  carRegistration: Joi.string()
    .pattern(/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid car registration format'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email address'
    }),
  ppfProduct: Joi.string()
    .valid('Standard', 'Premium', 'Ultimate')
    .required(),
  warrantyPeriod: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .required()
    .messages({
      'number.min': 'Warranty must be at least 1 year',
      'number.max': 'Warranty cannot exceed 10 years'
    }),
  installationDate: Joi.date()
    .max('now')
    .required()
    .messages({
      'date.max': 'Installation date cannot be in the future'
    }),
  vehicleModel: Joi.string()
    .min(2)
    .max(100)
    .required()
});

// Admin Login Schema
const adminLoginSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
    })
});
```

### Client-Side Validation (Zod Schemas)
```typescript
// Mirror backend validation for immediate feedback
const customerFormSchema = z.object({
  carRegistration: z.string()
    .regex(/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/, 'Invalid format')
    .toUpperCase(),
  email: z.string().email('Invalid email'),
  ppfProduct: z.enum(['Standard', 'Premium', 'Ultimate']),
  warrantyPeriod: z.number().int().min(1).max(10),
  installationDate: z.date().max(new Date()),
  vehicleModel: z.string().min(2).max(100)
});
```

### Data Integrity Checks
- **Duplicate Detection** - Prevent duplicate car registrations
- **Email Uniqueness** - One car per email (configurable)
- **Date Validation** - Installation date not in future
- **Warranty Period** - Valid range for product type
- **Format Enforcement** - Standardized data formats

---

## 5. ADMIN PANEL FUNCTIONALITY

### Core Features
1. **Dashboard**
   - Overview statistics (total customers, recent installations)
   - Quick actions (add new customer, search)
   - Activity feed (recent changes)

2. **Customer Management**
   - Add new customer (form with all fields)
   - Edit existing customer details
   - Delete customer (with confirmation)
   - Search by registration number or email
   - Filter by product type, warranty period, date range

3. **Data Validation**
   - Real-time form validation
   - Duplicate registration detection
   - Email format verification
   - Date range validation

4. **Bulk Operations**
   - Import customers from CSV
   - Export data to CSV
   - Bulk update warranty periods

5. **Audit Trail**
   - View all changes made to records
   - Track which admin made changes
   - Timestamp for all operations

### Admin Panel UI Components
```
┌─────────────────────────────────────────┐
│  STARK SCHILD - ADMIN PANEL             │
├─────────────────────────────────────────┤
│  [Dashboard] [Customers] [Settings]    │
├─────────────────────────────────────────┤
│                                         │
│  + Add Customer    Search: [________]  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Recent Customers                  │  │
│  ├───────────────────────────────────┤  │
│  │ Reg No    | Email    | Product   │  │
│  │ KA01AB1234| user@email| Premium   │  │
│  │ MH02CD5678| user2@email| Standard│  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## 6. CUSTOMER PORTAL FUNCTIONALITY

### User Flow
1. **Landing Page**
   - Clean, branded interface
   - Input field for car registration number
   - "Check Warranty" button

2. **Email Verification**
   - Google Sign-In button
   - OAuth consent screen
   - Email extraction from Google profile
   - Verification against stored email

3. **Warranty Details Display**
   - Beautiful card-based layout
   - All customer details
   - Warranty expiry countdown
   - Installation certificate (printable)
   - Contact support button

### Customer Portal UI Components
```
┌─────────────────────────────────────────┐
│  STARK SCHILD - WARRANTY CHECK          │
├─────────────────────────────────────────┤
│                                         │
│  Enter Car Registration Number:          │
│  ┌─────────────────────────────────┐    │
│  │ KA01AB1234                      │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Check Warranty Status]                │
│                                         │
└─────────────────────────────────────────┘

After Verification:
┌─────────────────────────────────────────┐
│  Your Warranty Details                   │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │ Vehicle: BMW 3 Series             │  │
│  │ Registration: KA01AB1234         │  │
│  │ Product: Premium PPF              │  │
│  │ Warranty: 5 Years                │  │
│  │ Installed: Jan 15, 2024          │  │
│  │ Expires: Jan 15, 2029            │  │
│  │ Status: ✅ Active                │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Download Certificate] [Contact]      │
└─────────────────────────────────────────┘
```

---

## 7. API ENDPOINTS STRUCTURE

### Authentication Endpoints
```
POST /api/admin/login
POST /api/admin/refresh-token
POST /api/admin/logout
POST /api/customer/verify-email
POST /api/customer/google-auth
```

### Customer Data Endpoints (Admin)
```
GET    /api/customers
GET    /api/customers/:registration
POST   /api/customers
PUT    /api/customers/:registration
DELETE /api/customers/:registration
GET    /api/customers/search/:query
POST   /api/customers/bulk-import
GET    /api/customers/export
```

### Customer Portal Endpoints
```
POST   /api/lookup/registration
GET    /api/customer/details/:token
POST   /api/customer/verify-ownership
```

### Health & Monitoring
```
GET    /api/health
GET    /api/status
```

---

## 8. EDGE CASES & ERROR HANDLING

### Common Edge Cases
1. **Duplicate Registration Numbers**
   - Check before insertion
   - Return clear error message
   - Suggest similar registrations

2. **Email Mismatch**
   - User provides different email than stored
   - Clear error message
   - Contact support option

3. **Expired Warranty**
   - Show expired status
   - Offer renewal options
   - Historical data display

4. **Google OAuth Failures**
   - Fallback to email verification link
   - Clear error messages
   - Retry mechanism

5. **Google Sheets API Limits**
   - Implement exponential backoff
   - Queue system for bulk operations
   - Cache frequently accessed data

6. **Network Failures**
   - Offline mode indication
   - Local storage for drafts
   - Auto-retry on reconnection

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_REGISTRATION",
    "message": "Car registration KA01AB1234 already exists",
    "details": {
      "field": "carRegistration",
      "value": "KA01AB1234"
    }
  }
}
```

### Error Codes Reference
- `INVALID_INPUT` - Validation failed
- `DUPLICATE_REGISTRATION` - Car number exists
- `EMAIL_MISMATCH` - Email doesn't match
- `NOT_FOUND` - Record not found
- `UNAUTHORIZED` - Invalid/expired token
- `RATE_LIMITED` - Too many requests
- `SHEETS_API_ERROR` - Google Sheets error
- `OAUTH_FAILED` - Google authentication failed

---

## 9. PERFORMANCE OPTIMIZATION

### Backend Optimization
1. **Caching Strategy**
   - Redis for session storage
   - Cache frequent customer lookups (5-minute TTL)
   - Cache Google Sheets schema

2. **Database Optimization**
   - Index car registration numbers
   - Batch operations for bulk imports
   - Lazy loading for large datasets

3. **API Optimization**
   - Response compression (gzip)
   - Pagination for large datasets
   - Selective field retrieval

4. **Google Sheets Optimization**
   - Batch read/write operations
   - Minimize API calls
   - Use spreadsheet.values.batchUpdate

### Frontend Optimization
1. **Code Splitting**
   - Lazy load admin panel
   - Separate customer portal bundle
   - Dynamic imports for heavy components

2. **Asset Optimization**
   - Image compression
   - Font subsetting
   - CSS minification

3. **Rendering Optimization**
   - Virtual scrolling for large lists
   - Debounced search inputs
   - Memoized components

4. **Network Optimization**
   - API response caching
   - Optimistic UI updates
   - Background data refresh

---

## 10. DEPLOYMENT ARCHITECTURE

### Production Environment
```
┌─────────────────────────────────────────┐
│         Load Balancer (SSL)             │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
┌──────▼──────┐  ┌────▼─────┐
│  Node.js    │  │  Node.js │
│  Instance 1 │  │Instance 2│
└──────┬──────┘  └────┬─────┘
       │              │
       └──────┬───────┘
              │
    ┌─────────▼─────────┐
    │  Google Sheets API│
    └───────────────────┘
```

### Deployment Options
1. **Vercel/Netlify** - Frontend hosting
2. **Railway/Render** - Backend hosting
3. **Google Cloud Run** - Scalable backend
4. **AWS EC2** - Full control option

### Environment Variables
```env
# Google Sheets
GOOGLE_SHEETS_API_KEY=your_api_key
GOOGLE_SHEETS_SPREADSHEET_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_KEY=path_to_key.json

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=3600
REFRESH_TOKEN_SECRET=your_refresh_secret

# Server
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

---

## 11. TESTING STRATEGY

### Unit Testing
- API endpoint testing (Jest + Supertest)
- Validation function testing
- Utility function testing
- Component testing (React Testing Library)

### Integration Testing
- Google Sheets API integration
- OAuth flow testing
- End-to-end user flows
- Admin panel operations

### Security Testing
- Penetration testing
- SQL injection attempts
- XSS vulnerability scanning
- CSRF protection testing

### Performance Testing
- Load testing (Artillery/k6)
- API response time benchmarks
- Concurrent user simulation
- Memory leak detection

---

## 12. IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1-2)
- Set up Google Cloud project
- Configure Google Sheets API
- Create service account
- Set up Node.js backend structure
- Implement basic API endpoints
- Set up authentication system

### Phase 2: Admin Panel (Week 3-4)
- Build React admin interface
- Implement customer CRUD operations
- Add form validation
- Create dashboard
- Implement search and filter
- Add audit logging

### Phase 3: Customer Portal (Week 5-6)
- Build customer lookup interface
- Integrate Google OAuth
- Implement email verification
- Create warranty details display
- Add certificate generation
- Implement responsive design

### Phase 4: Security & Optimization (Week 7)
- Implement rate limiting
- Add security headers
- Set up CORS properly
- Implement caching
- Optimize API responses
- Add error handling

### Phase 5: Testing & Deployment (Week 8)
- Write comprehensive tests
- Perform security audit
- Deploy to staging
- User acceptance testing
- Deploy to production
- Set up monitoring

---

## 13. MAINTENANCE & MONITORING

### Monitoring Setup
- **Uptime Monitoring** - UptimeRobot/Pingdom
- **Error Tracking** - Sentry
- **Performance Monitoring** - New Relic/DataDog
- **Log Management** - Logtail/Papertrail

### Regular Maintenance Tasks
- Weekly: Review error logs
- Monthly: Security audit
- Quarterly: API key rotation
- Bi-annually: Performance review
- Annually: Full security assessment

### Backup Strategy
- Google Sheets has built-in version history
- Export weekly backups to local storage
- Maintain change logs
- Disaster recovery plan

---

## 14. COST ESTIMATION

### Development Costs
- Development time: 8 weeks (1 developer)
- Testing & QA: 1 week
- Total: ~9 weeks

### Infrastructure Costs (Monthly)
- Backend hosting: $20-50 (Railway/Render)
- Frontend hosting: $0 (Vercel free tier)
- Domain: $12/year
- SSL certificate: $0 (Let's Encrypt)
- Monitoring: $0-29 (Sentry free tier)
- **Total Monthly**: $20-79

### Google Services
- Google Sheets API: Free (within limits)
- Google OAuth: Free
- **Total**: $0

---

## 15. NEXT STEPS

1. **Immediate Actions**
   - Create Google Cloud project
   - Set up Google Sheet with proper structure
   - Generate service account credentials
   - Choose hosting platform

2. **Development Setup**
   - Initialize Git repository
   - Set up development environment
   - Create project structure
   - Install dependencies

3. **API Integration**
   - Test Google Sheets API connection
   - Implement basic CRUD operations
   - Set up authentication
   - Create validation schemas

4. **Frontend Development**
   - Build admin panel UI
   - Implement customer portal
   - Add Google OAuth integration
   - Create responsive design

5. **Testing & Deployment**
   - Write comprehensive tests
   - Perform security audit
   - Deploy to production
   - Set up monitoring

---

## 16. RESOURCES & DOCUMENTATION

### Useful Links
- Google Sheets API Documentation: https://developers.google.com/sheets/api
- Google OAuth 2.0: https://developers.google.com/identity/protocols/oauth2
- Node.js Best Practices: https://github.com/goldbergyoni/nodebestpractices
- React Security: https://react.dev/learn/keeping-components-pure

### Recommended Libraries
- Google Sheets API: `googleapis`
- OAuth: `passport-google-oauth20`
- Validation: `joi`, `zod`
- Security: `helmet`, `bcrypt`, `jsonwebtoken`
- Testing: `jest`, `supertest`, `@testing-library/react`

---

This roadmap provides a complete technical foundation for building your PPF customer management system. Each section can be expanded based on specific requirements during implementation.
