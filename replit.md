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
- **June 30, 2025**: Enhanced supervisor features sidebar with clean count-based navigation and page routing
  - Simplified sidebar to show feature type counts without detailed individual listings
  - Implemented direct navigation to dedicated feature pages when clicking feature types
  - Added feature type icons (Tower, Manhole, FiberCable, Parcel) with visual indicators
  - Created streamlined interface where sidebar shows totals and pages show full details
  - Enhanced user experience by separating navigation (sidebar) from detailed information (pages)
  - Clicking feature types navigates to respective feature list pages for comprehensive management
  - Maintained boundary count display with appropriate navigation flow
  - Removed detailed cards from sidebar per user preference for cleaner interface
- **June 30, 2025**: Enhanced field team dashboard with comprehensive fixes and improvements
  - Fixed boundary assignment display to show proper backend feature data (type, number, status)
  - Corrected image upload form response format from 'images' to 'imagePaths' for proper database storage
  - Updated feature popups to display team names instead of team IDs with proper backend queries
  - Enhanced parcel creation workflow for field teams within assigned boundary validation
  - Improved field team boundary assignment visualization with real feature data from backend
  - Added comprehensive "Area Features Overview" section similar to supervisor dashboard but focused on assigned boundaries
  - Enhanced dashboard layout with visual feature statistics per boundary area with proper SVG icons
  - Implemented boundary-specific feature counts (towers, manholes, cables, parcels) with color-coded sections
  - Fixed feature creation dialog to show default infrastructure features (Tower, Manhole, Fiber Cable, Parcel) for field teams
  - Added boundary restriction warning message for field teams in feature selection dialog
  - Enabled direct feature creation without requiring template setup for field team users
- **June 30, 2025**: Implemented comprehensive supervisor-only access for all feature management functionality
  - Restricted sidebar feature list and plus sign (+) button to supervisors only
  - Created SupervisorRoutes component for role-based route protection
  - Protected feature detail pages (/features/:featureType and /features/:featureType/:featureId) with supervisor-only access
  - Hidden features tab and statistics from field user dashboard
  - Enhanced sidebar with SVG icons for feature types (tower, manhole, cable, parcel) replacing color indicators
  - Implemented separate feature detail pages with comprehensive information display
  - Added FeatureList and FeatureDetails pages with search, filtering, and individual feature information
  - Field users now have clean interface without feature management capabilities
- **June 30, 2025**: Added city field to team creation form and implemented city filtering in team management
  - Added city field to team schema (ITeam interface) and MongoDB team model
  - Updated team creation form in supervisor dashboard to include optional city input field
  - Implemented city filtering dropdown in team management interface showing all unique cities
  - Enhanced TeamCard component to display city information when available
  - Added comprehensive filtering: teams can now be filtered by both city and search text
  - Updated team creation form validation to include city field in Zod schema
- **June 28, 2025**: Enhanced field team dashboard with comprehensive team information display
  - Added team name prominently displayed at the top of field user dashboard
  - Implemented team member count showing all users registered with same team name
  - Added total assigned tasks count for the entire team
  - Created assigned boundary areas section showing category and status information
  - Updated dashboard layout with clean card-based responsive design
  - Team member calculation now matches users by team name rather than team ID for accurate counting
- **June 28, 2025**: Implemented SVG feature icons with color-coded status system and map legend
  - Created comprehensive SVG icon system for all feature types (Tower, Manhole, FiberCable, Parcel)
  - Implemented dynamic status-based color coding: assigned (blue), unassigned (black), complete (green), delayed (red)
  - Added MapLegend component displaying both status colors and feature type icons
  - Positioned legend on right side of map view for easy reference during feature management
  - Enhanced visual clarity for supervisors and field teams to quickly identify feature status
  - SVG icons allow dynamic color changes for real-time status visualization
- **June 28, 2025**: Completed comprehensive UI responsiveness overhaul and JSX syntax fixes
  - Fixed critical JSX syntax errors in Dashboard component that were preventing application startup
  - Implemented comprehensive responsive design improvements across all application pages
  - Enhanced button visibility and layout consistency throughout entire application interface
  - Updated padding, spacing, and card layouts for optimal viewing on mobile, tablet, and desktop
  - Improved AuthenticatedRoutes, Reports, TaskList, and Dashboard components with proper responsive grid layouts
  - Added consistent spacing patterns and background colors for better visual hierarchy
  - Ensured all interactive elements are properly accessible across different screen sizes
  - Application now starts successfully with clean UI structure and proper component rendering
- **June 28, 2025**: Enhanced submission workflow with preview/download capabilities and improved UI responsiveness
  - Added file preview functionality: supervisors can view submitted files directly in browser
  - Implemented file download feature: supervisors can save submission files with original filenames
  - Removed task distribution chart from team performance tab for cleaner supervisor interface
  - Enhanced UI responsiveness across all screen sizes with proper button visibility
  - Updated main app layout with consistent padding and overflow handling
  - Improved submission card layout with responsive flex design for mobile and desktop
  - Fixed task filtering in Submissions page to properly show assigned tasks for field teams
  - Added proper spacing and background colors for better visual hierarchy
- **June 28, 2025**: Implemented task submission workflow for field teams and supervisor review system
  - Created complete submission workflow: field teams upload files through "Submission" tab, supervisors review in "Reports" tab
  - Added TaskSubmission schema with file upload support for PDF, images, and document formats
  - Implemented submission API routes with multer file upload middleware and proper validation
  - Field teams see "Submission" navigation tab instead of "Reports" tab for role-based UI
  - Supervisors can review team submissions with approve/reject functionality and comments
  - File upload supports 10MB limit with comprehensive file type validation
  - Submission status tracking: Pending, Reviewed, Approved, Rejected with visual indicators
  - Added team selection dropdown for supervisors to view submissions by specific teams
  - Integrated submission history with task details and file download capabilities
- **June 28, 2025**: Implemented universal single-button feature creation workflow and boundary restrictions
  - Single blue button for feature creation available to both supervisors and field teams
  - Feature selection dialog shows appropriate features based on user role
  - Field teams can create all features (including parcels) only within assigned boundary areas
  - Supervisors can create all feature types including Land Parcels anywhere on map
  - Removed multiple drawing tool buttons for simplified interface
  - Made boundaries hollow (no fill) with dashed outline for better visibility
  - Added strict validation to prevent field teams from creating features outside assigned boundaries
  - Updated terminology from "assigned parcel" to "assigned boundaries"
  - Restricted "Create Inspection Task" button to supervisors only - field teams can only view and update assigned tasks
  - Changed "parcel assignments" to "boundary assignments" throughout the interface for consistent terminology
- **June 24, 2025**: Implemented strict boundary restrictions for field teams
  - Field users only see boundaries (parcels) assigned to their team
  - Field users can only create features within their assigned parcel boundaries
  - Feature creation tools for field users include boundary validation
  - Supervisors maintain full map access and can create features anywhere
  - Added sample boundaries with team assignments for testing
  - Field users see assigned parcel information in drawing tools interface

## Changelog
- June 24, 2025. Initial setup with complete role-based access control

## User Preferences

Preferred communication style: Simple, everyday language.