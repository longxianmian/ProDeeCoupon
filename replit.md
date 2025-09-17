# PreDee Coupon System

## Overview

PreDee is a comprehensive H5 coupon system designed for the Thailand market. The system enables users to claim, manage, and redeem digital coupons through a mobile-optimized web application. It features LINE Login integration for user authentication, multi-language support (Chinese, English, Thai), and includes both customer-facing functionality and admin management tools. The platform supports location-based store discovery, QR code redemption, and real-time coupon tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Vue 3 with Composition API
- **UI Library**: Vant (mobile-first components) for customer interface, Element Plus for admin panels
- **State Management**: Pinia for reactive state management
- **Routing**: Vue Router with history mode
- **Internationalization**: Vue I18n supporting Chinese, English, and Thai languages
- **Build Tool**: Vite with modern ES module support and hot module replacement
- **Mobile Optimization**: Responsive design with touch-friendly interfaces and PWA capabilities

### Backend Architecture
- **Framework**: Express.js with RESTful API design
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Security**: Helmet middleware for security headers, CORS configuration
- **Input Validation**: Joi schema validation for request data
- **File Processing**: QR code generation using qrcode library
- **Development Tools**: Nodemon for auto-reloading, concurrently for parallel processes

### Database Architecture
- **ORM**: Drizzle ORM with PostgreSQL driver
- **Schema Design**: Type-safe schema definitions with relations
- **Connection Management**: Connection pooling with configurable limits
- **Migration System**: Drizzle Kit for schema generation and database migrations
- **Core Tables**:
  - Users (LINE ID integration, following status, preferences)
  - Coupons (activities with pricing, quantity, validity periods)
  - Stores (location data with coordinates for proximity calculations)
  - User Coupons (claimed coupons with redemption tracking)
  - Admins (management access control)

### Authentication System
- **LINE Login Integration**: OAuth flow for seamless user onboarding
- **JWT Token Management**: Secure token generation with configurable expiration
- **Multi-level Access**: User authentication and separate admin authentication
- **Session Management**: Token-based stateless authentication

### Location Services
- **Geolocation API**: Browser-based user location detection
- **Distance Calculation**: Haversine formula for store proximity
- **Map Integration**: Google Maps API integration for navigation
- **Store Discovery**: Location-based filtering and sorting

### QR Code System
- **Dual Redemption Methods**: QR codes and 6-digit numeric codes
- **Secure Generation**: Cryptographic signatures to prevent tampering
- **Real-time Validation**: Server-side verification during redemption
- **Staff Interface**: Dedicated scanning interface for store employees

## External Dependencies

### Core Technology Stack
- **Vue 3**: Frontend framework with reactive composition API
- **Express.js**: Backend web application framework
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **PostgreSQL**: Primary database for data persistence

### UI and Component Libraries
- **Vant**: Mobile-optimized Vue components for customer interface
- **Element Plus**: Desktop-optimized components for admin interfaces
- **ECharts**: Data visualization for analytics dashboards
- **Vue Router**: Client-side routing for single-page application

### Authentication and Security
- **LINE Login API**: OAuth provider for user authentication
- **bcryptjs**: Password hashing for admin accounts
- **jsonwebtoken**: JWT token generation and verification
- **helmet**: Security middleware for HTTP headers

### Utility Libraries
- **Joi**: Schema validation for API requests
- **qrcode**: QR code generation for coupon redemption
- **axios**: HTTP client for API communication
- **vue-i18n**: Internationalization framework
- **@vueuse/core**: Vue composition utilities

### Development Tools
- **Vite**: Build tool and development server
- **nodemon**: Auto-reloading for development
- **concurrently**: Parallel process execution
- **drizzle-kit**: Database migration and studio tools

### External Services Integration
- **LINE Messaging API**: Push notifications and user communication
- **Google Maps API**: Store location and navigation services
- **Replit Storage**: Object storage for images and assets (when deployed)

The system is designed as a monorepo with clear separation between client and server codebases, enabling independent deployment and scaling of frontend and backend components.