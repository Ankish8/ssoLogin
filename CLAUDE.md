# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite project implementing an **Enterprise SSO Onboarding Flow** prototype. It's a complete 7-step user journey from signup to dashboard, designed as a reference for developers building enterprise authentication flows.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Core Flow Structure
The application is built around a **multi-step state machine** with 7 distinct steps:
1. **signup** - Account creation form
2. **email-sent** - Email verification waiting state
3. **verified** - Email confirmation success
4. **org-setup** - Organization setup introduction
5. **domain-verification** - DNS verification process
6. **org-creation** - Organization naming
7. **dashboard** - Completion and next actions

### Key Components

- **App.tsx** - Main component containing all step logic and state management
- **InteractiveBackground** - MagicUI FlickeringGrid with mouse interaction for steps 1-6
- **shadcn/ui components** - Card, Button, Input, Label, Alert for consistent UI
- **MagicUI components** - FlickeringGrid for animated backgrounds

### Design System Integration

- **shadcn/ui** with Tailwind CSS for component library
- **Brand colors** - Primary violet-600 (#581C60) for buttons and accents
- **Path aliases** - `@/components` and `@/lib` configured via TypeScript
- **CSS variables** - Tailwind design tokens in `src/index.css`

### State Management
Single component state using React hooks:
- `step` - Controls current flow step
- Form fields - `fullName`, `email`, `password`, `organizationName`
- `verificationStatus` - DNS verification state machine

### Interactive Features
- **MagicUI FlickeringGrid** background on steps 1-6 (not dashboard)
- **Mouse-responsive animations** that increase flicker rate on interaction
- **Navigation buttons** for testing (bottom left/right corners)
- **Realistic DNS verification** with loading states and error handling

## Adding MagicUI Components

Use the shadcn CLI to add MagicUI components:
```bash
npx shadcn@latest add "https://magicui.design/r/[component-name]"
```

Components are installed to `src/components/magicui/` and require the `motion` package for animations.

## Brand Consistency

The global brand palette is stored in `/Users/ankish/.claude/CLAUDE.md` with violet-600 (#581C60) as the primary color. Always use this color for primary buttons, accents, and key UI elements throughout the flow.

## Enterprise SSO UI Flow Specification

This prototype implements **Flow 1** from the complete Enterprise SSO specification below. The current implementation covers the new user onboarding and organization setup journey (CORPORATE to CORPORATE_ADMIN role transition).

### User Roles & Personas

| Role | Description | Key Objectives |
|------|-------------|----------------|
| **CORPORATE** | Standard user role for an employee of a client organization. Can sign up directly (if org not verified) or be provisioned via SSO. Initial state for future external admin. | Access platform features via direct login or SSO |
| **CORPORATE_ADMIN** | CORPORATE user who has successfully verified their organization's domain | Setup organization, configure SSO, manage other CORPORATE users |
| **SYSTEM_ADMIN** | Internal admin with override and management capabilities | Support corporate clients, manage platform settings, handle exceptions |

### Flow 1: New User Onboarding & Organization Setup (CORPORATE → CORPORATE_ADMIN)

**Current Implementation Status: ✅ COMPLETE**

| Step | Action | Implementation Details |
|------|--------|------------------------|
| **1.1: Initial Signup** | User signs up with corporate email | ✅ Registration form with email, password, full name |
| **1.2: Email Verification** | User clicks verification link | ✅ Email verification confirmation screen |
| **1.3: First Login & Setup** | Blocking modal appears | ✅ Organization setup modal with progress indicator |
| **1.4: Domain Verification** | Admin proves domain ownership | ✅ DNS TXT record display, verification token, polling status |
| **1.5: Organization Creation** | Create organization entity | ✅ Organization name input, role update logic |
| **1.6: Flow Completion** | Redirect to admin dashboard | ✅ Dashboard with SSO setup, user management, settings cards |

### Future Implementation Flows

**Flow 2: SSO Configuration (CORPORATE_ADMIN)**
- Phase 1: SAML/OIDC protocol configuration
- Phase 2: User provisioning (JIT/SCIM) and directory sync

**Flow 3: User SSO Policy & Migration (CORPORATE_ADMIN)**
- Enforce SSO-only login organization-wide
- Link existing password users to SSO
- Exception handling for specific users

**Flow 4: SSO-First Login Experience (CORPORATE)**
- Domain-based IdP discovery
- Automatic SSO redirection
- Fallback to password login

**Flow 5: System Administrator Controls (SYSTEM_ADMIN)**
- Organization search and management
- Override capabilities and limits
- DNS verification bypass options

### Technical Implementation Notes

- **DNS Verification**: Currently simulated with random success/failure for demo
- **Role Management**: User role transition from CORPORATE to CORPORATE_ADMIN
- **State Persistence**: Form data maintained across steps
- **Error Handling**: Comprehensive status states for verification processes
- **Interactive Design**: MagicUI FlickeringGrid enhances UX without interfering with functionality