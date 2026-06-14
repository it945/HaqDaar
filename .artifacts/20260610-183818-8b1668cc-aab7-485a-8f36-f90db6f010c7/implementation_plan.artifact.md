# Full Blueprint Implementation Plan

This plan implements the complete **HaqDaar No-Custody & Trust Agent Model** as defined in `blueprint.md`. We are moving from a placeholder UI to a fully functional transparency platform using Supabase.

## User Review Required

> [!IMPORTANT]
> **EasyPaisa Integration**: The "Pay via EasyPaisa" feature uses URL schemes (`easypaisa://`). This works best on mobile devices with the app installed. On web/desktop, it will show an error or do nothing.
> **Identity QR**: For the MVP, the "Physical Identity QR" will be a downloadable image/view that Admins can show or print.

## Proposed Changes

### 1. Database & Types (Supabase)

#### [supabase.ts](file:///C:/Users/pain4/Downloads/haqdaar%20(1)/src/lib/supabase.ts)
- Add `settlement_records` and `audit_logs` to TypeScript definitions.
- Ensure all status enums (`settlement_status`, `donee_status`) are correctly typed.

---

### 2. Core Business Logic (AuthContext)

#### [AuthContext.tsx](file:///C:/Users/pain4/Downloads/haqdaar%20(1)/src/context/AuthContext.tsx)
- **Deep Linking**: Add `openEasyPaisa(phone, amount)` helper.
- **Verification Flow**: Implement `verifyDonation` to update `donee.funded_credit` upon approval.
- **Settlement Logic**: Add `initiateSettlement(shopId)` to create records and mark spending as `settled`.
- **Identity Tool**: Add `registerDonee(data)` for Admin use.

---

### 3. User Interface Enhancements (App.tsx)

#### [App.tsx](file:///C:/Users/pain4/Downloads/haqdaar%20(1)/src/App.tsx)

**A. Donor Journey**
- Replace placeholder QR in `selectedDonee` modal with a real "Pay Rs. X via EasyPaisa" button.
- Implement file upload for payment screenshots using Supabase Storage (mocked for now if bucket isn't set).

**B. Admin Dashboard**
- **Verify Proofs**: Connect the modal to real `donation_records` where `status = 'pending_verification'`.
- **QR Generator**: Add a new tab/view for Admins to create new Donees and generate their `spending_qr_code`.
- **Settlements**: Connect to real `spending_records` grouped by `shopkeeper_id`.

**C. Shopkeeper Portal**
- Real-time credit check: When scanning a QR, fetch the `donee.funded_credit` and prevent release if credit is insufficient.

---

### 4. Navigation & Routes
- Add `/admin/manage` for Donee registration.
- Add `/settlements` for Shopkeeper/Admin history.

## Verification Plan

### Automated Tests
- No automated tests requested, but I will verify via `flutter analyze` (if applicable) or by monitoring the Vite dev console.

### Manual Verification
1.  **Donor Flow**: Log in as Donor -> Pay Donee -> Upload Screenshot -> Check Supabase.
2.  **Admin Flow**: Log in as Admin -> Verify Screenshot -> Check if Donee `funded_credit` increased.
3.  **Shopkeeper Flow**: Log in as Shopkeeper -> Scan QR -> Record Spending -> Check if `funded_credit` decreased.
4.  **Settlement**: Log in as Admin -> Initiate Settlement -> Verify `spending_records` are now `settled`.
