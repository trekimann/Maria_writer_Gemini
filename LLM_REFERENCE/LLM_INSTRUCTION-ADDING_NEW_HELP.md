# Adding New Help Content

This document outlines the process for adding new help buttons and content to the Maria Writer application. Follow these instructions when asked to add help documentation to specific UI elements.

## System Overview

The help system consists of two parts:
1. **Markdown Content**: Help files stored in `public/help/*.md`.
2. **Help Button**: A React component (`HelpButton`) that triggers a modal displaying the content content.

## Step 1: Create Help Content

1. Create a new markdown file in `public/help/`.
2. Name the file using a descriptive kebab-case identifier (e.g., `character-editor.md`). This filename (without extension) will be the `helpId`.
3. Add the help content using standard Markdown.

**Example:** `public/help/my-feature.md`
```markdown
# My Feature

This is the help content for **My Feature**.

## How to use
1. Click the button.
2. View results.
```

## Step 2: Add Help Button

1. Locate the React component where you want the help button to appear.
2. Import the `HelpButton` component.
   ```tsx
   import { HelpButton } from 'path/to/components/atoms/HelpButton';
   ```
   *Note: Adjust the import path based on the file structure.*
3. Place the `HelpButton` component in the JSX, passing the `helpId` that matches your markdown filename.

**Example Usage:**
```tsx
// src/components/organisms/MyComponent.tsx

export const MyComponent = () => {
  return (
    <div className="header">
      <h1>My Feature</h1>
      {/* Matches public/help/my-feature.md */}
      <HelpButton helpId="my-feature" /> 
    </div>
  );
};
```

## Optional Props

The `HelpButton` accepts the following optional props:
- `size` (number): Icon size in pixels (default: 18).
- `className` (string): Additional CSS classes.

## Testing

1. Verify the `.md` file exists in `public/help/`.
2. Verify the button appears in the UI.
3. Click the button and ensure the content renders correctly in the modal.
