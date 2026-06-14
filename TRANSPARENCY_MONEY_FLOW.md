# HaqDaar: No-Custody Transparency Flow (Trust Agent Model)
**Concept: The App as a Witness, Not a Vault**

This document defines the "Trust Agent" model for the HaqDaar platform. This model is designed for **non-technical Donees** who do not have phones but have external EasyPaisa accounts.

---

## 1. User Flow & Interactions

```mermaid
graph TD
    %% Styling
    classDef scope fill:#333,stroke:#666,stroke-width:2px,color:#fff;
    classDef roles fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef system fill:#e1f5fe,stroke:#01579b,stroke-width:2px;

    subgraph Limitations ["Scope & Limitations"]
        L1["Donor: Direct external payment only"]
        L2["Donee: No phone. Uses Physical QR Card"]
        L3["Shopkeeper: Provides goods on credit"]
        L4["Admin: Facilitates weekly bank settlement"]
    end
    class Limitations scope;

    %% Roles
    Donor((Donor))
    Admin((Admin/Settler))
    Shopkeeper((Shopkeeper<br/>Trust Agent))
    Donee((Donee<br/>Offline Verified))
    
    %% Systems
    subgraph Platform ["HaqDaar App"]
        Ledger[Impact Ledger / Settlement Reports]
        IdentityQR[Physical Identity QR]
    end
    
    subgraph External ["External Banking"]
        DoneeBank[Donee EasyPaisa Account]
        ShopBank[Shopkeeper EasyPaisa Account]
    end

    %% Connections
    Donor -- "1. Pays Externally" --> DoneeBank
    Donor -- "2. Uploads Proof" --> Ledger
    
    Donee -- "3. Shows Physical QR" --> Shopkeeper
    Shopkeeper -- "4. Scans & Records Items" --> Ledger
    Shopkeeper -- "5. Releases Goods" --> Donee
    
    Admin -- "6. Audits Spending" --> Ledger
    Admin -- "7. Facilitates Transfer" --> External
    DoneeBank -- "Weekly Settlement" --> ShopBank
    Admin -- "8. Marks as Settled" --> Ledger

    %% Legend/Details
    class Donor,Admin,Shopkeeper,Donee roles;
    class Ledger,IdentityQR system;
    class DoneeBank,ShopBank external;
```

---

## 2. Step-by-Step Cycle Details

### Step 1: Onboarding & Funding
*   **Action**: Admin verifies a Donee offline, creates an EasyPaisa account for them, and prints a **Physical QR Card**.
*   **Donation**: Donor sends money directly to the Donee's EasyPaisa.
*   **Verification**: Admin approves the Donor's proof. The app now shows the Donee as **"Funded"**.

### Step 2: In-Shop Transaction (Credit Basis)
*   **Action**: Donee visits an authorized Shopkeeper and presents their QR Card.
*   **Verification**: Shopkeeper scans the card with the HaqDaar app, verifies the Donee's photo and "Available Credit."
*   **Release**: Shopkeeper gives the goods and records the transaction in the app. 
*   **Status**: This record is marked as `Pending Settlement`.

### Step 3: Weekly Settlement
*   **Action**: Admin reviews the "Shopkeeper Settlement Report" in the app.
*   **Execution**: Admin facilitates the transfer from the Donee's EasyPaisa accounts to the Shopkeeper's account to cover the cost of goods released.
*   **Closing**: Admin marks the transactions as `Settled`.

---

## 3. Mandatory Terminology

| **Avoid (Prohibited)** | **Use Instead (Official)** |
| :--- | :--- |
| Wallet Balance | Impact Credit / Donation Record |
| Withdraw | Settlement / Release |
| App Transfer | External Bank Settlement |
| Top-up | Donor Proof Submission |

---

## 4. Key Rules
1.  **Direct Receipt**: Money always lands in the Donee's name first (Legal requirement).
2.  **Credit-First**: Shopkeepers act as agents by providing goods before the bank transfer happens.
3.  **Audit Trail**: Every bag of flour is linked to a Donor's verified receipt.
