# Adding a New Routed Page

This document outlines the process for adding a new routed page to Maria Writer. Follow these instructions when asked to add a new full-page screen so it matches the current auth, routing, and layout architecture.

## System Overview

Maria Writer now uses a shared routed-page structure:

1. **Router**: Routes are defined in `src/App.tsx`.
2. **Auth Wrapper**: `AuthFrame` handles auth loading, protected-route redirects, and return-to behavior.
3. **Shared Layout**: `AppPageLayout` provides the common header/navigation shell.
4. **Auth Card Wrapper**: `AuthPageCard` is used for compact auth-style screens such as login/register.
5. **Editor Shell**: `MainLayout` is the editor-specific workspace and should stay separate from normal content pages.

## Page Types

Before creating a page, decide which category it belongs to:

### 1. Public Routed Page
Use this for pages like login, register, marketing/info pages, or guest-accessible full screens.

- Wrap the route with `AuthFrame`
- Build the page content with `AppPageLayout`
- Use `AuthPageCard` if the page is form-centric and should look like login/register

### 2. Protected Routed Page
Use this for account pages or anything that requires a signed-in user.

- Wrap the route with `AuthFrame requireAuth`
- Build the page with `AppPageLayout`
- Use `useAuth()` inside the page for user data and profile actions

### 3. Editor-Only Workspace
Use this only if the page is really part of the writing workspace itself.

- Keep editor-specific UI inside `MainLayout`
- Do **not** duplicate editor chrome in a normal page component

## Current Route Conventions

As of the current app structure:

- `/` redirects to `/editor`
- `/editor` is the main writing workspace
- `/login` is the sign-in page
- `/register` is the registration page
- `/profile` is a protected account page
- Unknown routes redirect to `/editor`

Prefer adding a clean top-level route like `/settings` or `/admin/users` rather than nesting route state in modals unless the feature is explicitly modal-driven.

## Step 1: Create the Page Component

Create the component in `src/components/pages/`.

**Example:** `src/components/pages/MyNewPage.tsx`

```tsx
import React from 'react';
import { AppPageLayout } from '../templates/AppPageLayout';

export const MyNewPage: React.FC = () => {
	return (
		<AppPageLayout>
			<section>
				<h1>My New Page</h1>
				<p>Page content goes here.</p>
			</section>
		</AppPageLayout>
	);
};
```

## Step 2: Decide Whether the Route Is Protected

### Public route example

```tsx
<Route path="/my-page" element={<AuthFrame><MyNewPage /></AuthFrame>} />
```

### Protected route example

```tsx
<Route path="/my-page" element={<AuthFrame requireAuth><MyNewPage /></AuthFrame>} />
```

Use `requireAuth` when:
- the page reads or edits account data
- the page depends on authenticated cloud/project access
- the page should redirect guests to login

## Step 3: Add the Route in `src/App.tsx`

Import the new page and add the route in the `Routes` block.

**Example:**

```tsx
import { MyNewPage } from './components/pages/MyNewPage';

<Route path="/my-page" element={<AuthFrame requireAuth><MyNewPage /></AuthFrame>} />
```

If the page should appear in top-level navigation, also update `AppPageLayout.tsx`.

## Step 4: Use the Shared Layout Correctly

`AppPageLayout` supports a few extension points:

- `menuBar` - for a secondary toolbar such as the editor `TopBar`
- `headerActions` - for page-specific actions in the top-right of the header
- `contentClassName` - for page-specific content styling
- `flushContent` - when the page needs edge-to-edge layout instead of padded content

### Typical content page

```tsx
<AppPageLayout>
	<section>...</section>
</AppPageLayout>
```

### Page with header actions

```tsx
<AppPageLayout
	headerActions={<button type="button">Save</button>}
>
	<section>...</section>
</AppPageLayout>
```

### Editor-style shell

```tsx
<AppPageLayout menuBar={<TopBar showBrand={false} />} flushContent>
	...
</AppPageLayout>
```

## Step 5: If It Is an Auth-Style Form Page, Use `AuthPageCard`

For login/register-like pages, wrap the form in `AuthPageCard`.

**Example:**

```tsx
import { AuthPageCard } from '../atoms/AuthPageCard';
import { AppPageLayout } from '../templates/AppPageLayout';

export const ExampleFormPage: React.FC = () => {
	return (
		<AppPageLayout>
			<AuthPageCard
				title="Example"
				subtitle="Complete the form below"
				footer={<p>Helpful footer content</p>}
			>
				<form>{/* fields */}</form>
			</AuthPageCard>
		</AppPageLayout>
	);
};
```

## Step 6: Handle Auth and Return-To Properly

If the page is protected, `AuthFrame` already handles redirecting unauthenticated users to `/login` and storing the return path.

Inside the page itself:
- use `useAuth()` for account actions
- avoid duplicating auth gating logic already handled by `AuthFrame`
- only add `if (!user) return null;` when the component truly depends on the loaded authenticated user object

## Step 7: Add Styling

Create a matching SCSS module beside the page.

**Example:**
- `src/components/pages/MyNewPage.tsx`
- `src/components/pages/MyNewPage.module.scss`

Prefer existing tokens, spacing, and patterns already used by:
- `LoginPage`
- `RegisterPage`
- `UserProfilePage`
- `AppPageLayout`

Avoid creating a one-off page shell if the shared layout already fits.

## Step 8: Add Tests

At minimum, add a page test in `src/components/pages/`.

Typical test coverage should include:

1. The page renders expected content
2. Protected behavior if relevant
3. Important user actions (save, navigate, submit, cancel, etc.)
4. Any route-specific behavior

Useful existing references:
- `src/components/pages/LoginPage.test.tsx`
- `src/components/pages/RegisterPage.test.tsx`
- `src/components/pages/UserProfilePage.test.tsx`
- `src/App.routes.test.tsx`

## Step 9: Update Navigation If Needed

If the page should be discoverable from the main header nav, add a `NavItem` entry in `AppPageLayout.tsx`.

If it is a contextual page instead, add navigation from the relevant component:
- button in a modal
- header action
- sidebar link
- account menu item

## Step 10: Update Documentation If the Page Is User-Facing

If the page is a real user-facing feature, update one or more of:

- `README.md`
- `FUTURE_FEATURES/MULTI_USER_IMPLEMENTATION_PLAN.md`
- a help markdown file in `public/help/`

If the page needs a help button, follow:
- `LLM_REFERENCE/LLM_INSTRUCTION-ADDING_NEW_HELP.md`

## Recommended File Checklist

For a typical new routed page, expect some or all of these changes:

```text
src/components/pages/MyNewPage.tsx
src/components/pages/MyNewPage.module.scss
src/components/pages/MyNewPage.test.tsx
src/App.tsx
src/components/templates/AppPageLayout.tsx        (only if page should appear in nav)
README.md                                         (if user-facing)
public/help/my-new-page.md                        (if help content is needed)
```

## Example Patterns

### Protected account page

Use this pattern for pages similar to the current profile page:

```tsx
// App.tsx
<Route path="/account" element={<AuthFrame requireAuth><AccountPage /></AuthFrame>} />

// AccountPage.tsx
export const AccountPage: React.FC = () => {
	const { user } = useAuth();
	if (!user) return null;

	return (
		<AppPageLayout>
			<section>
				<h1>{user.displayName ?? user.username}</h1>
			</section>
		</AppPageLayout>
	);
};
```

### Public form page

Use this for a support/contact/request-access style page:

```tsx
<Route path="/request-access" element={<AuthFrame><RequestAccessPage /></AuthFrame>} />
```

With page body:

```tsx
<AppPageLayout>
	<AuthPageCard title="Request Access" subtitle="Tell us what you need">
		<form>{/* fields */}</form>
	</AuthPageCard>
</AppPageLayout>
```

## Testing Checklist

Before considering the page complete:

1. Verify the route renders
2. Verify protected redirect behavior if applicable
3. Verify the page uses `AppPageLayout`
4. Verify key actions work
5. Verify related navigation points link to the new route
6. Verify the page matches existing routed page styling conventions
