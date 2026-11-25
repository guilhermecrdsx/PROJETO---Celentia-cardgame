# Firestore Security Specification (Phase 0 — Payload-First Security TDD)

## 1. Data Invariants
1. **Default Deny**: All unspecified Firestore paths deny read and write.
2. **Verified Admin Only Writes**: Only an authenticated user with `email_verified == true` matching the bootstrapped admin email (`guilhermecrds84@gmail.com`) or a document in `/admins/{uid}` may create, update, or delete `/patch_notes/{releaseId}` or read/write `/patch_drafts/{draftId}`.
3. **Draft Isolation**: Unauthenticated users and regular players can NEVER read (`get` or `list`) `/patch_drafts/{draftId}`.
4. **Public Release Guard**: Public `get` and `list` on `/patch_notes/{releaseId}` strictly require `resource.data.isPublished == true`.
5. **Strict Schema & Size Bounds**: Every string field enforces `.size()`, version matches semantic version regex, `entries` list is bounded (`<= 40`) with validated first-item map shape, and no shadow/unknown keys are permitted (`hasAll` + `hasOnly`).
6. **Temporal & Identity Integrity**: `publishedAt` is immutable after creation (`incoming().publishedAt == existing().publishedAt`), `updatedAt == request.time`, and `updatedBy == request.auth.uid`.
7. **Admin Self-Elevation Blocked**: Client writes to `/admins/{userId}` are unconditionally `false`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Shadow Field Injection on Create**: Admin creates `/patch_notes/v1_5_0` with extra field `isAdminBypass: true`.
2. **Email Spoofing (Unverified Email)**: Attacker with `email: "guilhermecrds84@gmail.com"` and `email_verified: false` attempts to write `/patch_drafts/current`.
3. **Non-Admin Draft Read**: Regular signed-in player attempts `get` on `/patch_drafts/current`.
4. **Non-Admin Draft List**: Regular signed-in player attempts `list` on `/patch_drafts`.
5. **Non-Admin Release Publish**: Regular player attempts `create` on `/patch_notes/v9_9_9`.
6. **ID Poisoning**: Admin attempts `create` on `/patch_notes/invalid$id!with*spaces_over_128_chars...`.
7. **Oversized Summary (Denial of Wallet)**: Admin attempts to write a 2000-char `summary` to `/patch_notes/v1_5_0`.
8. **Oversized Entries Array**: Admin attempts to write 45 items in `entries` array.
9. **Spoofed `updatedBy` UID**: Admin sets `updatedBy: "another_uid"` instead of `request.auth.uid`.
10. **Forged Client Timestamp**: Admin sets `updatedAt` to a past timestamp instead of `request.time`.
11. **Mutating Immutable `publishedAt`**: Admin attempts to change `publishedAt` on an existing `/patch_notes/v1_4_0` document.
12. **Self-Assigned Admin Escalation**: Regular user attempts `create` on `/admins/{theirUid}` with `{ role: "admin" }`.
13. **Unauthorized Global Rank Policy Mutation**: Non-admin user attempts `create`/`update` on `/game_config/rank_policy` or admin passes an unlisted tier or extra shadow field.

