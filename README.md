# GeoFieldX - Field Operations Management Platform

A comprehensive field operations management platform that enables real-time tracking and team coordination for supervisors across diverse operational environments.

## Features

- Interactive mapping with OpenLayers
- Real-time team tracking and coordination
- Polygon drawing for parcel features
- Task management and assignment
- Role-based authentication
- Internationalization support (English/Arabic)
- MongoDB database integration

## Prerequisites

- Node.js (v18 or higher)
- MongoDB connection (provided in .env)
- npm or yarn package manager

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
The project includes a `.env` file with the MongoDB connection string already configured.

### 3. Run Development Server

**Option A: Using the batch file (Windows)**
```bash
dev.bat
```

**Option B: Using PowerShell**
```powershell
.\dev.ps1
```

**Option C: Using npx directly**
```bash
npx cross-env NODE_ENV=development tsx server/index.ts
```

The application will start on `http://localhost:5000`

## Default Login Credentials

**Supervisor Account:**
- Username: `supervisor`
- Password: `admin123`

**Field User Account:**
- Username: `fielduser1`
- Password: `field123`

## Project Structure

- `client/` - React frontend with TypeScript
- `server/` - Express.js backend
- `shared/` - Shared schemas and types
- `uploads/` - File upload directory

## Key Technologies

- **Frontend:** React, TypeScript, OpenLayers, Tailwind CSS
- **Backend:** Express.js, Node.js
- **Database:** MongoDB with Mongoose
- **Authentication:** Passport.js with local strategy
- **Mapping:** OpenLayers with polygon drawing capabilities

## Development Notes

- The project uses OpenLayers instead of Leaflet for enhanced mapping capabilities
- Parcel features support polygon drawing functionality
- Real-time updates are handled through API polling
- The application supports both English and Arabic with RTL layout