# ProDee Coupon System

## Overview
ProDee is an H5 coupon system for the Thailand market, enabling users to claim, manage, and redeem digital coupons via a mobile-optimized web application. It aims to be a robust, localized digital promotion solution, enhancing user engagement and offering significant market potential. Key capabilities include LINE Login integration, multi-language support, location-based store discovery, QR code and manual redemption, real-time coupon tracking, and a comprehensive rewards mall. The system allows unauthenticated browsing for content, requiring login only for interactive actions.

**Recent Update (Oct 23, 2025)**: Optimized home feed card display logic with intelligent time-based sorting and 4:1 content-to-activity ratio (every 4 content cards followed by 1 activity card). All cards are sorted by publish time (newest first), then activities are interspersed at the 4:1 ratio for optimal user engagement.

**Recent Update (Oct 22, 2025)**: Added TikTok/Instagram advertising compliance components to coupon detail pages, including SubjectCard (platform entity disclosure) and SiteFooter (brand information and legal links) to meet social media advertising审核 requirements.

## User Preferences
Preferred communication style: Simple, everyday language.
Architecture Philosophy: Prioritize system stability and simplicity over feature complexity.

## System Architecture
### Frontend
- **Framework**: Vue 3 (Composition API)
- **UI Libraries**: Vant (customer), Element Plus (admin)
- **State Management**: Pinia
- **Routing**: Vue Router
- **Internationalization**: Vue I18n (Chinese, English, Thai)
- **Build Tool**: Vite
- **Mobile Optimization**: Responsive design, PWA capabilities
- **UI/UX Decisions**: Language selector, simplified redemption, dynamic bottom navigation, redesigned MyPoints page, Home feed with 4 interaction buttons, Xiaohongshu-style immersive video feed with swipe navigation, auto-play, custom controls, multi-tiered content ranking, Redbook-style comments drawer with nested replies.
- **Home Feed Algorithm**: Intelligent card display with time-based sorting (newest first) and 4:1 content-to-activity ratio. Content cards (videos/articles) and activity cards (coupons/campaigns) are sorted by `publishedAt` timestamp, then interspersed with 4 content cards followed by 1 activity card for balanced user engagement.
- **Compliance Components**: TikTok/Instagram advertising compliance features:
  - **SubjectCard**: Displays platform entity (ProDee/GENCROSS CO., LTD.) and fulfillment party information below coupon title
  - **SiteFooter**: Fixed page footer with brand name, contact email, and legal links (Privacy Policy, Terms of Service, Data Deletion)
  - **Multi-language Support**: Compliance text available in Chinese, English, and Thai via vue-i18n
  - **Email Escaping**: Uses `{\'@\'}` syntax to avoid vue-i18n linked format conflicts

### Backend
- **Framework**: Express.js (RESTful API)
- **Authentication**: JWT-based with bcrypt
- **Security**: Helmet, CORS
- **Input Validation**: Joi
- **File Processing**: QR code generation
- **Video Analytics**: Tracks play duration, completion, and count. Hot score algorithm for content ranking.
- **Related Videos API**: Intelligent content recommendations.

### Database
- **ORM**: Drizzle ORM (PostgreSQL driver)
- **Schema Design**: Type-safe with relations, extended for rewards mall, admin accounts, and video play statistics.
- **Migration**: Drizzle Kit
- **Core Tables**: Users, Coupons, Stores, User Coupons, Admins, RewardItems, RewardRedemptions, PointTransactions, PointBuckets, CouponCodes, `video_play_stats`.

### Authentication
- **LINE Login**: Multi-strategy authentication optimized for different environments.
  - **LIFF ID Token Exchange (Primary)**: For LINE WebView environments.
  - **OAuth PKCE Login (Fallback)**: For non-LINE browser environments, with PKCE for security.
  - **Smart Environment Detection**: Detects LINE environment (`isInLINE()`) to choose the appropriate flow.
  - **Token Management**: JWT tokens signed with `JWT_SECRET`, stored as HttpOnly cookie (`prodee_session`).
  - **Cookie Settings**: `HttpOnly; Secure; SameSite=None; Max-Age=2592000; Path=/`.
  - **Login Flow**: No automatic login on page load; explicit user action triggers login. LIFF exchange in WebView, OAuth PKCE redirect in external browsers, with graceful degradation.
  - **State Parameter**: Uses Base64URL(JSON) format for OAuth state, with standardized encoding/decoding via `server/utils/base64url.js`. Original state value stored without truncation (pkce_sessions.state varchar(256)). State validation uses exact match query followed by structured payload verification (sid, timestamp, 5-minute expiry).
- **Facebook IAB Login**: One-click login for Facebook In-App Browser environments.
  - **IAB Detection**: Automatically detects Facebook App WebView (FBAV/FBAN user agents).
  - **JS SDK Integration**: Lazy-loads Facebook SDK only in IAB environments for optimal performance.
  - **Token Verification**: Backend validates access tokens via Facebook Graph API `debug_token` endpoint.
  - **User Binding**: Links Facebook User ID to internal user accounts (`users.facebook_user_id` field).
  - **Session Management**: 30-day JWT session stored as HttpOnly cookie (`prodee_session`).
  - **Minimal Permissions**: Only requests `public_profile` scope for basic user information.
  - **Graceful Fallback**: Button only displays in Facebook IAB; hidden in other browsers.
  - **Environment Control**: Enabled/disabled via `FB_LOGIN_ENABLED` environment variable.
- **Access Control**: Multi-level (User, Admin roles: super_admin, content_operator) with role-based middleware.

### Location Services
- **Geolocation API**: Browser-based.
- **Distance Calculation**: Haversine formula.
- **Map Integration**: Google Maps API.
- **Store Discovery**: Location-based filtering.

### QR Code and Manual Code System
- **Redemption**: Supports both QR codes and 6-digit numeric codes.
- **Security**: Cryptographic signatures for codes.
- **Validation**: Real-time server-side.

### Content Management
- **Multi-Account System**: Role-based admin accounts.
- **Content Authorship**: Posts linked to admin accounts.
- **Permission Middleware**: Ensures role-based access.
- **Multi-language**: Automated translation for posts via AI.

### Admin Features
- **Rewards Mall Admin**: CRUD for reward items, campaigns config, redemption orders. Multi-image upload.
- **Admin Security**: Auto-logout based on JWT expiry and inactivity.
- **Staff Activity Guide**: Admin-defined SOPs and notes for campaigns.

#### System Design Choices
- **Automated Schema Compilation**: TypeScript schema compiled to JavaScript.
- **Guest Access**: Rewards Mall pages allow unauthenticated browsing; redemption requires login.
- **Simplified Redemption**: Staff interface focuses on manual code input.
- **Rewards Mall Product Detail Page**: Full-featured page with multi-image carousel, multi-language support, points requirement, stock status, and dynamic redeem button states.
- **Deployment**: Production deployment scripts for database initialization and environment setup. Isolated development and production databases.

## External Dependencies
- **Vue 3**: Frontend framework
- **Express.js**: Backend framework
- **Drizzle ORM**: Database operations
- **PostgreSQL**: Primary database
- **Vant**: Mobile UI components
- **Element Plus**: Desktop UI components
- **ECharts**: Data visualization
- **Vue Router**: Client-side routing
- **Vuedraggable**: Drag-and-drop for image reordering
- **LINE Login API**: OAuth provider
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT handling
- **helmet**: Security middleware
- **Joi**: Schema validation
- **qrcode**: QR code generation
- **axios**: HTTP client
- **vue-i18n**: Internationalization
- **@vueuse/core**: Vue composition utilities
- **Vite**: Build tool
- **drizzle-kit**: Database migration
- **LINE Messaging API**: Push notifications
- **Google Maps API**: Store location, navigation, address recognition
- **Replit Object Storage**: For images and assets
- **OpenAI Service (via Replit AI Integrations)**: For automated multi-language content translation.

## Deployment Configuration

### Production Environment
- **Platform**: Replit Autoscale Deployment
- **Domain**: https://prodee.replit.app
- **Deployment Mode**: Autoscale (automatic scaling for web applications)
- **Database**: Isolated production PostgreSQL database (separate from development)
- **Object Storage**: Replit Object Storage (prodee-storage bucket)

### Build Process
```bash
npm run build
  ├─ npm run build:server  # Install server dependencies (npm ci)
  └─ npm run build:client  # Build Vue.js frontend (Vite)
```

### Production Runtime
- **Start Command**: `NODE_ENV=production node server/index.js`
- **Port**: 5000 (automatically bound)
- **Node.js**: v20 LTS

### Environment Variables (Production Secrets)
Required:
- `DATABASE_URL` - Production database connection
- `JWT_SECRET` - JWT signing secret
- `APP_JWT_SECRET` - Application JWT secret
- `LINE_CHANNEL_ID` - LINE Login Channel ID
- `LINE_CHANNEL_SECRET` - LINE Login Channel Secret
- `LINE_CHANNEL_ACCESS_TOKEN` - LINE Messaging API token
- `LINE_LIFF_CHANNEL_ID` - LINE LIFF Channel ID
- `VITE_LINE_LIFF_ID` - Frontend LIFF ID

Optional:
- `OMISE_PUBLIC_KEY` - Opn Payments public key
- `OMISE_SECRET_KEY` - Opn Payments secret key
- `FB_APP_ID` - Facebook App ID (for IAB login)
- `FB_APP_SECRET` - Facebook App Secret
- `FB_LOGIN_ENABLED` - Enable/disable Facebook IAB login

### CDN & Performance
- **Image/Video Caching**: 1-year browser cache + immutable
- **Cache Headers**: 
  - Media files: `Cache-Control: public, max-age=31536000, immutable`
  - HTML/CSS/JS: `Cache-Control: no-cache` (prevent version issues)
- **Video Streaming**: Range request support for seek/scrubbing
- **Video Thumbnails**: Automatic first-frame extraction (no manual upload needed)

### Development vs Production
| Aspect | Development | Production |
|--------|-------------|------------|
| Database | Dev PostgreSQL | Prod PostgreSQL (isolated) |
| Authentication | DEV_SKIP_AUTH=1 available | Full authentication required |
| Logging | Verbose console.log | Structured logging only |
| Error Messages | Detailed stack traces | User-friendly messages |
| CDN Caching | Disabled for HTML/JS | Full caching enabled |

### Deployment Checklist
See `DEPLOYMENT_CHECKLIST.md` for complete pre-deployment verification steps.

### Recent Updates (Oct 23, 2025)
- ✅ Removed video cover upload requirement (auto-uses first frame)
- ✅ Optimized CDN caching for media files
- ✅ Fixed vue-i18n email address parsing (split into components)
- ✅ Verified multi-platform authentication (LINE/Facebook/OAuth)
- ✅ Cleaned up deployment documentation