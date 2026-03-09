# Owner Comment Removal Plan

**Status:** Proposed  
**Last Updated:** March 9, 2026  
**Scope:** Plan only, no code changes

---

## Summary

There are currently **two different comment systems** in Maria Writer:

1. **Legacy editor inline comments** stored inside the project `data` blob and rendered in the manuscript editor.
2. **Collaborative review comments** stored in `ProjectReviewComment` and shown in the Read page review drawer.

These two systems are related from a user point of view, but they are implemented very differently today.

### Main finding

The biggest missing deletion/removal gap is in the **collaborative review comment flow**.

- The **Read page** supports listing comments, creating comments, and applying suggestions.
- It does **not** currently support removing a review comment.
- The **Editor** does not currently expose collaborative review comments at all, so there is no collaborative review removal flow there either.

### Important nuance

The legacy editor comment system already has an internal delete path for inline comments. That means the request is best understood as:

- add a **clear owner-only removal flow for collaborative comments**,
- expose that flow in **Read** first,
- and add an **Editor-side review surface** so the same owner can remove their own review comments while editing.

---

## Current State Analysis

## 1) Legacy editor inline comments

Current implementation exists in the frontend project state:

- `src/hooks/useEditorComments.ts`
- `src/components/organisms/CommentPane.tsx`
- `src/context/StoreContext.tsx`
- `src/utils/editorComments.ts`

### What already exists

- Inline comments are saved into `state.comments`
- Chapters keep `commentIds`
- The editor sidebar already exposes:
  - hide/show
  - delete
  - suggestion preview
  - suggestion apply
- Deleting an inline editor comment already:
  - unwraps/removes the markup from manuscript content
  - removes the comment from the store
  - removes the comment ID from the chapter

### Conclusion

If the ask is strictly about the **legacy editor-only inline comments**, deletion is already mostly implemented.

That suggests the real missing feature is **collaborative review comment deletion**, plus parity between **Read** and **Editor** for that newer collaboration workflow.

---

## 2) Collaborative review comments

Current implementation exists in:

### Backend

- `maria-writer-backend/prisma/schema.prisma`
- `maria-writer-backend/src/services/collaborationService.ts`
- `maria-writer-backend/src/controllers/collaborationController.ts`
- `maria-writer-backend/src/routes/projects.ts`
- `maria-writer-backend/src/utils/validation.ts`
- `maria-writer-backend/src/services/accessService.ts`

### Frontend

- `maria-writer-react/src/services/collaborationService.ts`
- `maria-writer-react/src/components/pages/useReadPageReviews.ts`
- `maria-writer-react/src/components/pages/ReadPageReviewDrawer.tsx`
- `maria-writer-react/src/components/pages/ReadPage.tsx`

### What exists today

- The database model already has `ReviewCommentStatus` with:
  - `ACTIVE`
  - `RESOLVED`
  - `HIDDEN`
- Review comment listing already excludes `HIDDEN`
- Users can:
  - list review comments
  - create review comments
  - apply suggestions

### What is missing

- No backend endpoint to remove/hide a review comment
- No frontend service method to remove/hide a review comment
- No Read page action button for removal
- No Editor-side collaborative review panel at all

---

## Recommended Phase 1 Scope

Start with **comments authored by the project owner** only.

### Phase 1 rule

A review comment can be removed only when **all** of the following are true:

1. the requester is the **project owner**
2. the requester is also the **author of that review comment**
3. the comment is still in an active removable state

### Why this scope is safest

This keeps the first rollout narrow and predictable:

- no collaborator moderation rules yet
- no questions about whether owners can delete collaborator comments yet
- no questions about whether collaborators can delete their own comments yet
- no need to solve full audit/moderation policy in the first pass

---

## Recommended Product Behavior

## A. Read page behavior

In the Read page review drawer, add a **Remove comment** action for owner-authored comments.

### Display rule

Show the remove action only when:

- `selectedProject.access.isOwner === true`
- `comment.author.id === currentUser.id`
- `comment.status === 'ACTIVE'`

### UX recommendation

Use a destructive action with confirmation:

- button label: `Remove comment`
- confirmation text: `Remove this comment from the project?`

### After success

- remove the card from the drawer immediately
- keep the current chapter selected
- show a lightweight success message if the product already has a suitable pattern

---

## B. Editor behavior

The Editor currently exposes the **legacy inline comment pane**, not the collaborative review comment system.

### Recommendation

Do **not** merge the two systems in the first pass.

Instead, add a separate **review comments surface in the Editor** that uses the same collaborative review API as the Read page.

### Best low-risk option

Add an Editor review drawer/panel that:

- loads project review comments for the current project
- filters to the active chapter
- shows the same comment cards as the Read page
- allows the owner to remove their own review comments
- optionally allows applying suggestions from the Editor as a follow-up if desired

### Why not merge into the existing `CommentPane`

Because `CommentPane` is built around `StoryComment` from the project blob, while collaborative review comments are a different type and lifecycle.

Merging them immediately would create avoidable risk:

- mixed data sources
- mixed deletion semantics
- mixed authorization rules
- higher UI confusion

### Recommended Phase 1 editor UX

Use either:

1. a new `Review` tab beside the existing comment pane, or
2. a separate right-side drawer similar to the Read page review drawer

The safest implementation is to **reuse the Read page review card layout** so behavior stays consistent.

---

## Backend Recommendation

## Use soft delete for collaborative review comments

For collaborative review comments, use the existing `HIDDEN` status instead of physically deleting rows.

### Why soft delete is the right first step

- the enum already exists
- list queries already exclude `HIDDEN`
- no schema migration is strictly required for a first pass
- this preserves history for future moderation/audit needs
- it avoids permanently destroying collaboration records

### Proposed endpoint

```text
DELETE /api/projects/:id/review-comments/:commentId
```

### Proposed response

```json
{
  "success": true,
  "commentId": "...",
  "status": "HIDDEN"
}
```

### Proposed backend logic

1. validate `projectId` and `commentId`
2. load project access for requester
3. confirm requester is project owner
4. load the comment by `id + projectId`
5. confirm `comment.authorId === requesterId`
6. confirm comment is removable (`ACTIVE` is the simplest first-pass rule)
7. update comment status to `HIDDEN`
8. return success payload

### Recommended removable states for Phase 1

Simplest rule:

- allow removal only for `ACTIVE`
- do not allow removal for `RESOLVED`
- `HIDDEN` is already removed

This avoids ambiguity around whether accepted suggestions should remain part of the review history.

---

## Frontend Recommendation

## Shared API/service changes

Add a new collaboration service method:

- `removeReviewComment(projectId, commentId)`

This should be used by both Read and Editor review surfaces.

## Shared state handling recommendation

If collaborative review comments are going to appear in both Read and Editor, create a shared hook or utility instead of duplicating logic.

### Good future shape

A shared hook such as:

- `useProjectReviewComments(...)`

could own:

- loading comments
- creating comments
- removing comments
- applying suggestions
- chapter filtering
- optimistic UI updates

Then:

- Read page can consume it
- Editor can consume it
- behavior stays consistent

---

## Authorization Rules for Phase 1

### Allowed

- project owner removes a review comment they personally authored

### Not allowed yet

- project owner removes collaborator-authored review comments
- collaborator removes owner-authored review comments
- collaborator removes their own review comments
- anonymous/guest deletion of collaborative review comments

### Why keep it this strict initially

It gives a very clean first policy:

> "You can remove your own owner comments first."

That matches the requested rollout order.

---

## Editor Inline Comments vs Collaborative Review Comments

This distinction matters for implementation planning.

## Legacy inline editor comments

Recommended behavior:

- keep existing delete behavior
- verify it is still discoverable and working after any future Editor review panel work
- do not refactor this system during the first collaborative deletion rollout

## Collaborative review comments

Recommended behavior:

- add explicit remove support via backend + frontend
- add the action to Read first
- then expose the same collaborative comments in Editor using a dedicated surface

### Practical takeaway

The first shipping milestone should focus on **collaborative review comments**, not on rewriting the old inline editor comment system.

---

## Suggested Delivery Order

## Milestone 1: Backend support

1. Add param validation for delete route
2. Add delete/hide service method in backend collaboration service
3. Add controller method
4. Add route
5. Add unit/integration tests

## Milestone 2: Read page support

1. Add frontend service method
2. Extend Read review hook with remove state/action
3. Add remove button in review drawer for eligible comments
4. Remove hidden comment from local UI state after success
5. Add Read page tests

## Milestone 3: Editor support

1. Introduce an Editor review surface for collaborative comments
2. Reuse the same review card/action pattern from Read
3. Support owner-only remove action there as well
4. Add Editor tests for visibility, confirmation, and state refresh

## Milestone 4: Cleanup and consistency

1. Ensure Read and Editor use shared review comment logic where practical
2. Align copy, button labels, and confirmations
3. Confirm resolved comments remain non-removable unless product decides otherwise

---

## Testing Plan

## Backend tests

Add tests for:

- owner can remove their own active review comment
- owner cannot remove a comment authored by a collaborator in Phase 1
- collaborator cannot remove owner-authored review comment
- removing a missing comment returns 404
- hidden comments no longer appear in list results

## Frontend tests

### Read page

Add tests for:

- remove button only appears for owner-authored active comments
- clicking remove calls the API and removes the comment from the drawer
- remove button does not appear for collaborator-authored comments
- API failure leaves the comment visible and shows an error

### Editor

When the Editor review surface is added, test:

- review comments load for the active chapter
- owner-authored comments show remove action
- successful removal updates the panel immediately
- the existing legacy inline comment pane still works unchanged

---

## Risks and Mitigations

## Risk 1: Confusion between two comment systems

### Mitigation

Be explicit in the UI:

- `Comments` for legacy inline editor notes
- `Review comments` for collaborative review workflow

Avoid combining them in one panel during the first rollout.

## Risk 2: Hard delete could remove useful audit history

### Mitigation

Use `HIDDEN` for collaborative review comments instead of row deletion.

## Risk 3: Future collaborator rules may conflict with Phase 1 design

### Mitigation

Keep authorization logic centralized in the backend collaboration service so later policy expansion is straightforward.

## Risk 4: Editor and Read implementations drift apart

### Mitigation

Use shared service methods and preferably a shared review-comments hook.

---

## Recommended Later Phase (Invited Commenters/Collaborators)

After Phase 1 is stable, expand policy intentionally instead of implicitly.

### Good next-step policy options

#### Option A: Author self-removal

Allow any authenticated comment author to remove their own active comment.

#### Option B: Owner moderation

Allow the project owner to hide collaborator-authored comments.

#### Option C: Both

Support:

- authors removing their own comments
- owners moderating any comment in their project

### Recommendation for later

Long-term, **Option C** is probably the most practical product policy, but it should be introduced only after the owner-authored flow is stable and tested.

If Option C is adopted later, it would be worth adding moderation metadata such as:

- `hiddenById`
- `hiddenAt`
- optional `hiddenReason`

That is not required for Phase 1.

---

## Final Recommendation

Implement owner comment removal in this order:

1. treat **collaborative review comments** as the primary missing gap
2. use **soft delete via `HIDDEN`** on the backend
3. ship the remove action in **Read** first
4. add a dedicated **Editor review surface** for the same collaborative comments
5. keep the old inline editor comment system separate for now

This gives the safest path to:

- owner-only removal first
- minimal schema churn
- consistent Read + Editor behavior
- clean expansion later for invited users
