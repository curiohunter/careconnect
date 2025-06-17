# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for production
- `npm run build:prod` - Build with production environment variables
- `npm run type-check` - Run TypeScript type checking
- `npm run test:build` - Run type check and build (use before committing)
- `npm run preview` - Preview production build locally

### Deployment Commands
- `npm run build` - Build the project
- `firebase deploy` - Deploy to Firebase (hosting, rules, indexes)
- `firebase deploy --only hosting` - Deploy only the web app
- `firebase deploy --only firestore:rules` - Deploy only Firestore rules
- `npm run deploy:dev` - Deploy to development environment
- `npm run deploy:prod` - Deploy to production environment
- `npm run backup` - Create backup of current data
- `npm run backup:prod` - Create production backup
- `./deploy.sh prod` - Full production deployment with validation

## Project Architecture

### Tech Stack
- **Frontend**: React 19.1 + TypeScript 5.7 + Vite 6.2
- **Backend**: Firebase 10.8 (Auth, Firestore, FCM)
- **Routing**: React Router DOM 7.6 (Hash routing)
- **Styling**: Tailwind CSS
- **Notifications**: React Hot Toast

### Core Architecture Pattern
This is a Firebase-based React app with a service layer pattern:

```
hooks/useAuth.tsx     - Authentication state management
hooks/useData.ts      - Data CRUD operations
services/authService.ts - Authentication business logic  
services/dataService.ts - Firestore data operations
types.ts             - Central type definitions
```

### Key Design Principles
- **Type-first development**: All interfaces defined in `types.ts`
- **Service layer separation**: Business logic in services, UI logic in hooks
- **Real-time sync**: Firestore onSnapshot for live updates
- **Hash routing**: Uses HashRouter for Firebase Hosting compatibility

### Critical File Modification Order
1. **types.ts** - Update type definitions first
2. **services/** - Update data layer
3. **hooks/** - Update React state management
4. **components/** - Update UI components last

### Firebase Collections Structure
- `users/` - User profiles and authentication data
- `connections/` - Parent-caregiver relationships
- `children/` - Child information
- `schedules/` - Daily schedules with nested structure
- `mealPlans/` - Meal planning with date-based system
- `medications/` - Medication tracking
- `specialSchedules/` - Special events (overtime, vacation, notices)

### Real-time Data Patterns
- Use `onSnapshot` for real-time listeners
- Always call `unsubscribe()` in cleanup
- Connection ID is the primary relationship key
- Date format: `YYYY-MM-DD` for all date strings

### Error Handling Standards
- All Firebase operations wrapped in try-catch
- User-friendly messages via react-hot-toast
- Error logging through errorMonitor.ts
- Type safety enforced at compile time

### Important Development Notes
- Never delete `.backup` files - they contain critical recovery data
- Environment variables must be set via `.env.production` for production
- Firebase security rules are strictly enforced - test in development first
- Mobile-first responsive design using Tailwind classes
- All components use TypeScript interfaces for props

### Firebase Security
- Firestore rules enforce user authentication
- Connection-based data access control
- User can only access data through their connections
- Production security rules include rate limiting and size validation