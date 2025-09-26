# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a React starter application that demonstrates custom authentication flows using Clerk. The project showcases a custom signup flow with form validation, email verification, and protected routes.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Lint code (with auto-fix)
npm run lint

# Format code
npm run format

# Preview production build
npm run preview
```

## Environment Setup

Required environment variable in `.env.local`:
```
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

Get your publishable key from [Clerk Dashboard API Keys](https://dashboard.clerk.dev/last-active?path=/api-keys).

## Architecture

### Core Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Routing**: React Router v6 with nested layouts
- **Authentication**: Clerk React SDK with custom flows  
- **Forms**: React Hook Form + Zod validation
- **Styling**: Tailwind CSS with custom design tokens

### Project Structure
```
src/
├── layouts/           # Route layout components
│   ├── root.tsx      # Root layout with ClerkProvider
│   └── dashboard.tsx # Protected dashboard layout
├── routes/           # Page components
│   ├── sign-up.tsx   # Custom signup flow implementation
│   ├── sign-in.tsx   # Sign in page
│   └── dashboard.tsx # Protected dashboard
├── components/       # Reusable UI components
└── styles/          # CSS and styling
```

### Authentication Flow
The app demonstrates a custom signup implementation that:
1. Uses React Hook Form with Zod schemas for complex password validation
2. Implements custom Clerk signup flow with `useSignUp()` hook
3. Handles email verification with custom UI
4. Manages multi-step form state transitions

### Key Components

**Root Layout (`src/layouts/root.tsx`)**
- Wraps app with `ClerkProvider`
- Handles navigation integration with React Router
- Provides global header with authentication state

**Dashboard Layout (`src/layouts/dashboard.tsx`)**
- Protects routes requiring authentication
- Automatically redirects unauthenticated users to sign-in
- Uses `useAuth()` hook for auth state management

**Custom Signup (`src/routes/sign-up.tsx`)**
- Complex form validation with password requirements
- Multi-step state management (ready → verify → done)
- Custom hooks for form handling and Clerk integration
- Demonstrates advanced Clerk signup patterns

### Form validation patterns
The signup form uses sophisticated Zod schemas with:
- Password complexity requirements (length, uppercase, lowercase, numbers, special chars)
- Password confirmation matching
- Terms of service acceptance
- Custom validation error handling

## Development Notes

### Working with Clerk
- All Clerk configuration happens in the root layout
- Use Clerk hooks (`useAuth`, `useSignUp`, etc.) for authentication state
- Custom flows require manual state management alongside Clerk's APIs
- Environment variables are prefixed with `VITE_` for Vite compatibility

### Styling System
- Tailwind configured with custom color palette for primary and success states
- CSS modules in `src/styles/` for component-specific styling
- Geist fonts configured (variables not currently implemented)

### Testing Authentication
- The signup form includes default test values for development
- Hardcoded test email in signup component should be replaced with dynamic input
- Password generation utility included for testing

### Router Configuration
- Uses createBrowserRouter with nested route structure
- Authentication routes use wildcard paths (`/sign-in/*`, `/sign-up/*`) for Clerk's internal routing
- Protected routes nested under dashboard layout with automatic redirection

### TypeScript Configuration
- Strict mode enabled with additional linting rules
- ESNext target with bundler module resolution
- React 18 types with JSX transform

## Common Development Patterns

When extending authentication:
- Create custom hooks following the `useClerkSignup` pattern
- Use Zod schemas for all form validation
- Implement state machines for multi-step flows
- Leverage Clerk's prepare/attempt pattern for verification flows

When adding protected routes:
- Nest under `DashboardLayout` or create similar auth-checking layouts  
- Use `useAuth` hook to check authentication state
- Implement loading states while auth is being determined