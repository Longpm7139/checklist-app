# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server (Next.js)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

## Architecture Overview

This is a **Vietnamese-language facility management checklist application** for airport/transportation operations staff. Built with Next.js (App Router), React 19, TypeScript, Tailwind CSS v4, and Firebase.

**Core flow**: All routes are protected by `UserProvider` (src/providers/UserProvider.tsx) — it wraps the entire app in the root layout and shows `LoginModal` if no user is in localStorage. Authentication is custom (not Firebase Auth): user code + bcrypt-hashed password stored in the `users` Firestore collection.

**State management**: React Context for auth (`UserProvider`), Firebase `onSnapshot()` real-time listeners for all data. No Redux or Zustand. Each page subscribes to the collections it needs and stores results in local `useState`. Always unsubscribe: `const unsub = subscribe(...); useEffect(() => unsub, [])`.

**Firebase** (src/lib/firebase.ts ~670 lines): Contains all Firestore and Storage interactions. Key Firestore collections: `systems`, `categories`, `details`, `users`, `logs`, `incidents`, `maintenance`, `duties`, `history`, `device_logs`, `safety_reports`, `procedures`, `pccc_reports`, `pbb_reports`, `material_history`, `license_categories`. Storage bucket holds checklist photos, incident photos, and maintenance images (compressed client-side to max 1000px, 60% JPEG).

## Key Conventions

**Vietnamese text input**: Use `IMESafeInput` component (src/components/IMESafeInput.tsx) for any text field that users may type Vietnamese into. It handles IME composition events to prevent partial character commits. The `normalize()` and `isMatch()` / `isVeryLenientMatch()` utilities in src/lib/utils.ts strip diacritics and normalize Unicode (including 'đ') for flexible name/code matching — this is critical for KPI attribution in the duties/analytics features.

**Firestore writes**: Always call `removeUndefined()` before writing to Firestore to avoid Firestore rejecting `undefined` values. This helper is in src/lib/firebase.ts.

**Image uploads**: Use the `ImageUpload` component (src/components/ImageUpload.tsx). Images are auto-compressed before upload. File paths follow the pattern `collection/docId/${timestamp}.jpg`.

**Route structure**: `src/app/` uses Next.js App Router. Dynamic routes include `/check/[systemId]` (checklist detail) and `/device-log/[systemId]` (equipment history). API routes under `src/app/api/` handle auth (`/api/auth/login`, `/api/auth/change-password`) and user CRUD (`/api/users`).

**User roles**: Stored in the user context (`code`, `name`, `role`). Admin-only sections (e.g., `/users`) check `user.role === 'admin'`.

## Environment Setup

Requires a `.env.local` file with Firebase config:
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

Firebase project: `checklistapp-38948`. Firestore rules are currently permissive (`allow read, write: if true`) — do not tighten without updating the auth flow to use Firebase Auth tokens.
