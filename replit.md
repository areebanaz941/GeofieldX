# GeoFieldX - Field Operations Management Platform

## Overview

GeoFieldX is a comprehensive field operations management platform that enables real-time tracking and team coordination for supervisors across diverse operational environments. The application provides interactive mapping capabilities, task management, team coordination, and role-based authentication with internationalization support.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theming and RTL support
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Internationalization**: react-i18next with English and Arabic language support
- **Maps**: OpenLayers for interactive mapping with custom feature visualization

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ESM modules
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Session-based authentication with bcrypt for password hashing
- **File Handling**: Multer for file uploads with local storage
- **API Design**: RESTful API with comprehensive CRUD operations

### Database Schema
The application uses MongoDB with the following main collections:
- **Users**: Authentication and role management (Supervisor/Field)
- **Teams**: Team organization and status tracking
- **Tasks**: Task assignment and progress tracking
- **Features**: Geographic features (Tower, Manhole, FiberCable, Parcel)
- **Boundaries**: Area assignments and management
- **TaskUpdates**: Task progress updates and comments
- **TaskEvidence**: File evidence attached to tasks

## Key Components

### Authentication System
- Role-based access control (Supervisor/Field users)
- Session-based authentication with secure password hashing
- Protected routes with automatic redirects

### Geographic Information System
- OpenLayers integration for interactive mapping
- Support for Point, LineString, and Polygon geometries
- Custom feature visualization with status-based coloring
- Real-time location tracking for field users

### Task Management
- Hierarchical task assignment (Supervisor → Team → Individual)
- Status tracking through predefined workflow states
- Evidence collection with file upload capabilities
- Real-time progress monitoring

### Team Coordination
- Team creation and management
- User assignment to teams
- Real-time activity status tracking
- Location-based team visualization

## Data Flow

1. **Authentication Flow**: Users authenticate through login form → Server validates credentials → Session created → User data cached
2. **Task Management Flow**: Supervisor creates task → Assigns to team → Field user receives task → Updates progress → Evidence submission → Supervisor review
3. **Geographic Data Flow**: Features created via map interaction → Stored with geometric data → Visualized on map with status indicators
4. **Real-time Updates**: Client polls server for updates → TanStack Query manages cache invalidation → UI updates automatically

## External Dependencies

### Core Dependencies
- **React Ecosystem**: React, React DOM, React Router (Wouter)
- **UI Framework**: Radix UI components, Tailwind CSS, Lucide icons
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form with Zod validation
- **Maps**: OpenLayers for GIS functionality
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: bcryptjs for password hashing
- **File Handling**: Multer for uploads
- **Internationalization**: i18next, react-i18next

### Development Dependencies
- **Build Tools**: Vite, TypeScript, ESBuild
- **Testing**: Type checking with TypeScript
- **Development**: tsx for TypeScript execution, cross-env for environment variables

## Deployment Strategy

### Development Environment
- Local development server runs on port 5000
- MongoDB Atlas connection for database
- Hot module replacement via Vite
- TypeScript compilation on-the-fly

### Production Build
- Vite builds optimized client bundle
- ESBuild bundles server code
- Static assets served from Express
- Environment-based configuration

### Replit Configuration
- Configured for Node.js 20 runtime
- PostgreSQL module available (for potential future migration)
- Autoscale deployment target
- Build and run scripts configured for production deployment

## Recent Changes
- **June 24, 2025**: Implemented role-based visibility restrictions for field users
  - Field users now only see tasks assigned to them or their team
  - Field users only see features within their team's assigned boundaries
  - Field users only see boundaries assigned to their team
  - Feature creation tools (point, line, polygon) are hidden from field users
  - Added boundary restrictions for field user feature creation

## Changelog
- June 24, 2025. Initial setup with complete role-based access control

## User Preferences

Preferred communication style: Simple, everyday language.