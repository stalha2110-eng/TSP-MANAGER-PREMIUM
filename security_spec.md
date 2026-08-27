# Firestore Security Specification

## Data Invariants
1.  **User Ownership**: All data (items, notes, settings) exists under `/users/{userId}`. A user can only read or write to their own `userId` path.
2.  **Item Integrity**: 
    -   `categoryId`, `quantity`, `buyingPrice`, and `retailPrice` are required.
    -   Prices and quantities must be non-negative.
    -   `lastUpdated` and `priceChangedAt` must be valid timestamps (server time).
3.  **Note Integrity**: 
    -   Title, category, and priority are required.
    -   Status must be one of ['Active', 'Completed'].
4.  **Settings Integrity**: 
    -   Users can only modify their own settings.

## The Dirty Dozen Payloads (Identity & Integrity Violations)
1.  **Identity Spoofing**: Attempt to write an item to another user's path (`/users/OTHER_USER/items/item1`).
2.  **Data Extraction**: Attempt to list another user's items (`/users/OTHER_USER/items`).
3.  **Cross-Path Poisoning**: Attempt to inject a setting document into the items collection.
4.  **Schema Bypass (Invalid Types)**: Attempt to set `quantity` to a string.
5.  **Schema Bypass (Negative Values)**: Attempt to set `buyingPrice` to -100.
6.  **Missing Required Fields**: Attempt to create an item without `retailPrice`.
7.  **Identity Mutation**: Attempt to update an item but change its `userId` field (if it existed at doc level).
8.  **Timestamp Forgery**: Attempt to set `lastUpdated` to a date in 2030 (not server time).
9.  **Enum Violation**: Attempt to set Note `priority` to 'Infinite'.
10. **State Skipping**: Attempt to bypass terminal states (if applicable).
11. **PII Leakage**: Attempt to read the entire `users` collection.
12. **Denial of Wallet**: Attempt to use an extremely long string for a category ID.

## Test Runner Logic
I will implement `firestore.rules.test.ts` to verify that these payloads return `PERMISSION_DENIED`.
