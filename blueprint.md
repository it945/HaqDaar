# HaqDaar - Secure Digital Funding Platform (Web/Mobile Capacitor)

## Overview

HaqDaar is a platform that enables non-profit organisations to distribute aid digitally through unique, tamper-proof QR tokens. This version uses a **Centralized Trust Account Model** for better accountability and simpler user flows.

## Centralized Trust Model (As Implemented)

### Core Roles
- **Donor**: Contributes funds directly to the Global Trust Pool. Can view impact stats but has no personal balance.
- **Admin**: Manages the Trust Pool, disburses aid to recipients by scanning their IDs, and oversees system-wide activity.
- **Recipient (HaqDaar)**: Receives allocated aid into a personal digital wallet and can withdraw funds to bank or cash.

### Technical Stack
- **Frontend**: React 19, TypeScript, Vite.
- **Styling**: Tailwind CSS.
- **Animations**: Framer Motion.
- **Backend**: Firebase Firestore (Centralized Trust documents).
- **Mobile Container**: Capacitor (Cross-platform Android/iOS).

## UI & Dashboard Features

### Dynamic Home Screen
- **Global Pool View**: Donors and Admins see the current size of the community vault and total distribution stats.
- **Recipient Wallet**: Beneficiaries see their specific "Available Aid" and recent receipt history.

### Role-Based Actions
- **Quick Donate**: High-friction-less interface for donors to feed the pool.
- **Aid Disbursement**: Admin-only tool to scan recipient QR codes and push funds from the pool to the user.
- **Withdrawal Portal**: Recipient-only interface to request cash-outs.

### Verification & History
- **System Ledger**: A unified activity log tracking donations, disbursements, and withdrawals with real-time updates.
- **Identity Card**: A secure QR-based identity system for verification during disbursement.

## Current Progress: Mobile Conversion
- [x] Migrated P2P logic to Trust Account Model.
- [x] Updated UI for role-based dashboards.
- [ ] Initializing Capacitor for Native Android/iOS builds.
- [ ] Swapping browser-cam for Native QR Scanner plugin.
