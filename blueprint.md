# HaqDaar - No-Custody Donor-Donee Transparency Platform

## 1. Executive Summary
HaqDaar is a transparency-first platform connecting donors with manually verified donees. It is intentionally designed as a **no-custody** system. The platform does not receive, hold, or process donation money. Instead, it records direct external payments and monitors how aid is used at local shops via a "Trust Agent" settlement model.

## 2. No-Custody & Trust Agent Model
- **Zero Custody**: All donor payments happen directly to the Donee's EasyPaisa account outside the app.
- **Trust Agent (Shopkeeper)**: Shopkeepers provide goods/services to Donees on a credit basis after scanning their physical QR cards.
- **Admin Settlement**: Admins facilitate weekly transfers from Donee accounts to Shopkeeper accounts based on the app's spending records.
- **Impact Wallet**: A record-only interface for donors to track their verified donation proofs and subsequent spending updates.

## 3. User Roles
- **Admin**: 
  - Verifies donees offline and prints physical QR cards.
  - Verifies donor payment proofs (screenshots).
  - Generates weekly settlement reports for Shopkeepers.
  - Oversees the transfer of funds from Donee to Shopkeeper accounts.
- **Donor**: 
  - Browses verified donees and pays them directly via EasyPaisa deep links.
  - Uploads proof of payment.
  - Receives transparency notifications when goods are released.
- **Shopkeeper (Trust Agent)**: 
  - Scans Donee's physical QR card to verify identity and available credit.
  - Releases goods on credit and records the items in the app.
  - Receives bulk settlement from Admin weekly.
- **Donee (Recipient)**: 
  - No phone required. Uses a physical Identity QR Card.
  - Receives funds in a personal EasyPaisa account (set up by Admin).
  - Picks up goods from authorized shopkeepers.

## 4. Key Technical Concepts
- **Physical Identity QR**: A printed card for the Donee containing their unique ID and photo verification link.
- **Deep Link Payments**: "Pay Now" buttons that launch the donor's EasyPaisa app with the Donee's number pre-filled.
- **Settlement Ledger**: Tracks `spending_records` and their status (`pending_settlement` vs `settled`).

## 5. Terminology (Mandatory)
- **Use**: Impact Wallet (records only), Direct donation proof, Spending identity QR, Credit Release, Admin Settlement, Pending verification.
- **Avoid**: Wallet balance, Top-up, Withdraw, Cash balance.

## 6. Technical Stack
- **Frontend**: React 19, TypeScript, Vite (Mobile-first PWA).
- **Backend**: Firebase Firestore & Storage.
- **Mobile Container**: Capacitor.

## 7. Next Implementation Steps
1. **Firestore Redesign**: Create `settlement_records` and update `spending_records` with status fields.
2. **QR Generation**: Build the tool for Admins to generate and print Donee Identity Cards.
3. **Donor Redirection**: Implement the "Open EasyPaisa" deep linking logic.
4. **Settlement Dashboard**: Build the Admin view for calculating weekly shopkeeper payouts.
