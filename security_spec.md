# Security Specification - Spektrum Kalibrasi Digital

## Data Invariants
1. A Message must have a valid `senderId` matching the authenticated user.
2. A Calibrator can only be created/updated by an authenticated technician/admin.
3. A Certificate must be linked to an existing Equipment.
4. User profiles (`users/{uid}`) must only be writable by the user themselves (for basic info) or an admin (for roles).
5. Medical Equipment records are shared across the team.

## The Dirty Dozen Payloads (Attacks)
1. **Identity Spoofing**: Attempt to create a message with `senderId` of another user.
2. **Privilege Escalation**: User attempts to update their own role to 'admin' in `users/{uid}`.
3. **Data Corruption**: Attempt to save a Calibrator with a 5MB string in the `name` field.
4. **Orphaned Record**: Create a Certificate for a non-existent `equipmentId`.
5. **Ghost Field Injection**: Add `isVerified: true` to a calibrator object.
6. **State Skip**: Update a worksheet status from `draft` to `approved` without required signature fields.
7. **Cross-Tenant Access**: Attempt to read a private notification of another user.
8. **Malicious Path**: Attempt to use `../` or special characters in a document ID.
9. **Spam Attack**: Create 1000 messages in 1 second (Rate limiting handled at rule level where possible).
10. **PII Leak**: Unauthorized user attempts colors list on `users` collection to scrape emails.
11. **Immutable Override**: Attempt to change `createdAt` on an existing calibrator.
12. **Unauthorized Deletion**: A non-admin user attempts to delete a master calibrator.

## Test Runner (Logic Check)
The security rules will use `isValidCalibrator()`, `isValidMessage()`, etc., to enforce these invariants.
Every write operation will be gated by `request.auth.uid`.
List operations will be restricted to ensure users only see relevant data (or team-wide data where appropriate).
