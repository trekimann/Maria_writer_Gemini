# `.maria` Export Security Review

Date: 2026-03-09

## Summary

Current `.maria` export behavior serializes the current frontend `AppState` directly to JSON.

### Conclusion

- **Passwords are not exported.**
- **Access tokens are not exported.**
- **Refresh tokens are not exported.**
- **Guest cloud identifiers are exported today, and that is a security issue.**

The main risk is not classic auth credentials. The main risk is leakage of **guest-access identifiers** stored in app state, specifically `cloudSync.guestId` and sometimes `cloudSync.projectId`.

---

## What was investigated

The review traced:

1. How `.maria` files are exported.
2. What data is actually inside frontend `AppState`.
3. Where authentication state is stored.
4. How guest and authenticated cloud project access works.
5. Whether imported `.maria` files preserve sensitive identifiers.

---

## Findings

## 1. `.maria` export currently serializes the full app state

The export path uses the current store state directly and writes it to disk as JSON.

Relevant areas reviewed:

- `maria-writer-react/src/utils/storage.ts`
- `maria-writer-react/src/components/organisms/SaveModal.tsx`
- `maria-writer-react/src/components/organisms/SaveSettingsModal.tsx`

Current behavior:

- `exportFile(state, ...)` receives the full current store state.
- It spreads the full `state` into the export payload.
- The payload is downloaded as a `.maria` file.

This means anything present in frontend `AppState` is eligible to be exported unless explicitly removed.

---

## 2. Auth credentials are not currently part of exported app state

Authentication state is managed separately from the editor/store state.

Relevant areas reviewed:

- `maria-writer-react/src/context/AuthContext.tsx`
- `maria-writer-react/src/services/authService.ts`
- `maria-writer-backend/src/controllers/authController.ts`

### Passwords

Passwords are only submitted during login/register requests. They are not stored in `AppState`, local autosave state, or export payload.

### Access token

The access token is kept in memory by the auth layer and is not part of the editor store `AppState`.

### Refresh token

The refresh token is stored as an `httpOnly` cookie by the backend and is not available to frontend export logic.

### Result

The new auth work does **not** appear to cause `.maria` export to leak passwords or token credentials.

---

## 3. `cloudSync` metadata is part of exported app state

Frontend `AppState` includes cloud sync metadata.

Relevant areas reviewed:

- `maria-writer-react/src/types/index.ts`
- `maria-writer-react/src/context/StoreContext.tsx`

`cloudSync` contains:

- `projectId`
- `guestId`
- `lastSyncedAt`
- `isSyncing`
- `syncError`

Because the export includes the full state, the `.maria` file can contain these values.

---

## 4. `guestId` is security-sensitive in the current backend design

Guest cloud operations are keyed by `guestId` when there is no authenticated user.

Relevant areas reviewed:

- `maria-writer-react/src/services/cloudStorage.ts`
- `maria-writer-backend/src/routes/projects.ts`
- `maria-writer-backend/src/controllers/projectController.ts`
- `maria-writer-backend/src/services/projectService.ts`

### Guest behavior today

When the user is not authenticated:

- frontend sends `guestId` in request query/body
- backend accepts guest-mode access when no bearer token is present
- backend uses `guestId` to list, get, update, and delete guest projects

That means `guestId` is not just metadata. It is effectively a **guest access key**.

### Why this matters

If a `.maria` export leaks a valid `guestId`, then the file leaks an identifier that can be used to reach guest-owned cloud projects.

If the exported state also contains `projectId`, the file may reveal both:

- the guest access key (`guestId`)
- the target cloud project identifier (`projectId`)

That combination is sensitive.

---

## 5. Import currently preserves cloud sync identifiers

The import/load flow merges imported state back into the live app state and keeps `raw.cloudSync` unless selectively overwritten.

Relevant area reviewed:

- `maria-writer-react/src/components/organisms/LoadProjectModal.tsx`

This means a `.maria` file can also carry cloud sync identifiers forward through import, not just through export.

---

## Risk assessment

## Confirmed safe

The following do **not** appear to leak through `.maria` export:

- account password
- access token
- refresh token cookie
- bearer authorization header values

## Confirmed risky

The following **do** appear to leak today:

- `cloudSync.guestId`
- `cloudSync.projectId` (when present)
- possibly other operational cloud sync metadata that should not travel with portable book files

## Severity

**Moderate to High**, depending on how guest cloud projects are meant to be trusted.

Reason:

- `.maria` is presented as a portable story/project file.
- users may share/export/back up these files freely.
- exporting live guest-access identifiers creates a privilege boundary problem.

---

## Proposal for fixing

## Primary design goal

A `.maria` file should be a **portable content file**, not a transport for session, identity, or cloud ownership state.

## Proposed rule

### Export should include only book/project content

Keep exportable:

- `meta`
- `chapters`
- `characters`
- `events`
- `relationships`
- `comments`
- `timeline`
- editor-safe presentation data that belongs to the project itself

Exclude from export:

- `cloudSync.projectId`
- `cloudSync.guestId`
- `cloudSync.lastSyncedAt`
- `cloudSync.isSyncing`
- `cloudSync.syncError`
- any auth-derived or environment-derived state
- any future migration/session identifiers

---

## Recommended implementation approach

## Option A — Preferred

Create a dedicated export sanitizer/serializer.

Example concept:

- add a function that converts `AppState` to `ExportedMariaFile`
- explicitly whitelist fields allowed in `.maria`
- use that serializer for export only
- use a separate import normalizer that rebuilds runtime-only state safely

### Why this is preferred

- avoids accidental future leaks
- makes the export contract explicit
- is easier to test
- clearly separates portable file format from runtime app state

---

## Import behavior proposal

On import of a `.maria` file:

- ignore any incoming `cloudSync` block entirely, or
- rebuild `cloudSync` from current runtime context instead of trusting imported values

Recommended imported defaults:

- preserve current runtime `guestId` from the browser/session
- set `projectId` to `null` unless the import came from an explicit cloud-load action
- reset sync timestamps and transient sync flags
- reset transient modal/UI state

This keeps imported files from impersonating prior cloud bindings.

---

## Additional hardening proposal

Even after export/import cleanup, guest access should still be treated carefully.

### Recommended backend hardening

Longer-term, consider reducing trust in raw `guestId` alone.

Possible future improvements:

1. rotate guest identifiers more aggressively
2. use an additional secret or signed guest capability instead of bare ID lookup
3. bind guest access to a stronger proof than a plain UUID
4. reduce lifetime/scope of guest cloud ownership paths

These changes are useful, but they are **secondary** to fixing export/import.

---

## Test plan proposal

Add tests covering both export and import.

## Export tests

Verify `.maria` export does **not** include:

- `cloudSync.guestId`
- `cloudSync.projectId`
- any auth state
- any runtime-only sync flags

Verify it **does** include:

- content state
- metadata
- comments
- supported project-level customizations

## Import tests

Verify imported `.maria` files:

- do not restore `guestId` from file
- do not restore `projectId` from file
- do not restore transient sync state
- do preserve content state correctly

## Regression tests

Add a focused security regression test that fails if future exports include `guestId` or `projectId`.

---

## Recommended acceptance criteria

1. Exported `.maria` files contain no auth, session, or cloud ownership identifiers.
2. Imported `.maria` files cannot rebind the app to old guest cloud resources.
3. Cloud-loaded projects can still intentionally set `projectId` in runtime state after server load.
4. Existing local backup/export workflows continue to work for story content.
5. Tests explicitly protect against reintroducing this leak.

---

## Final recommendation

Implement a **whitelist-based export format** and treat `cloudSync` as runtime-only state.

That is the safest and cleanest fix.

It removes the current guest-ID leak, prevents similar future leaks, and aligns `.maria` with user expectations of a portable project file rather than a session-bearing state dump.
