# Adding New Theme Colors

This document outlines the process for adding new color properties to the Maria Writer theme system. Follow these instructions when asked to add new color types for features like special highlighting, new UI elements, or semantic color coding.

## System Overview

The theme system uses CSS custom properties (CSS variables) managed through React Context:
- **CSS Variables**: Define default light/dark colors in `src/styles/main.scss`
- **TypeScript Interface**: Type-safe color properties in `src/context/ThemeContext.tsx`
- **Theme Context**: Runtime theme management and custom theme storage
- **Configuration UI**: User-facing color picker in `src/components/organisms/ThemeConfigModal.tsx`

Custom themes are persisted in both localStorage and `.maria` project files.

## Step-by-Step Process

### Step 1: Update TypeScript Interface

1. Open `src/context/ThemeContext.tsx`
2. Locate the `ThemeColors` interface
3. Add new properties with **optional** `?` modifier (allows gradual rollout)

**Example:** Adding romantic scene highlighting
```typescript
export interface ThemeColors {
  'color-primary': string;
  'color-bg': string;
  // ... existing properties
  
  // New feature colors - make optional
  'romantic-text'?: string;
  'romantic-text-hover'?: string;
  'romantic-bg'?: string;
  'romantic-bg-hover'?: string;
}
```

**Naming Convention:**
- Use kebab-case format: `feature-property`
- Common suffixes: `-text`, `-text-hover`, `-bg`, `-bg-hover`, `-border`
- Match CSS custom property naming exactly

### Step 2: Add Default Theme Values

1. In the same file, locate `lightTheme` and `darkTheme` objects
2. Add default color values for both themes
3. Choose accessible colors that work well in each mode

**Example:**
```typescript
const lightTheme: ThemeColors = {
  'color-primary': '#4f46e5',
  // ... existing properties
  
  // Light mode romantic colors - soft pink tones
  'romantic-text': '#ec4899',
  'romantic-text-hover': '#db2777',
  'romantic-bg': '#fce7f3',
  'romantic-bg-hover': '#fbcfe8',
};

const darkTheme: ThemeColors = {
  'color-primary': '#818cf8',
  // ... existing properties
  
  // Dark mode romantic colors - brighter text, deeper backgrounds
  'romantic-text': '#f9a8d4',
  'romantic-text-hover': '#fbcfe8',
  'romantic-bg': '#831843',
  'romantic-bg-hover': '#9f1239',
};
```

**Color Selection Tips:**
- **Light Mode**: Darker text (#000-#600), lighter backgrounds (#f00-#fff)
- **Dark Mode**: Lighter text (#a00-#fff), darker backgrounds (#000-#600)
- Ensure 4.5:1 contrast ratio for accessibility (WCAG AA)
- Use color palette tools: [Tailwind Colors](https://tailwindcss.com/docs/customizing-colors), [Coolors](https://coolors.co)

### Step 3: Add to Configuration UI

1. Open `src/components/organisms/ThemeConfigModal.tsx`
2. Locate the `COLOR_OPTIONS` array
3. Add entries for your new colors (grouped by category)

**Example:**
```typescript
const COLOR_OPTIONS = [
  // Core Colors
  { key: 'color-primary', label: 'Primary Color', category: 'Core' },
  { key: 'color-bg', label: 'Background', category: 'Core' },
  // ... existing options
  
  // Special Highlights - new category
  { key: 'romantic-text', label: 'Romantic Text', category: 'Special Highlights' },
  { key: 'romantic-text-hover', label: 'Romantic Text (Hover)', category: 'Special Highlights' },
  { key: 'romantic-bg', label: 'Romantic Background', category: 'Special Highlights' },
  { key: 'romantic-bg-hover', label: 'Romantic Background (Hover)', category: 'Special Highlights' },
];
```

**UI Grouping:**
- Colors with the same `category` are grouped together in the UI
- Common categories: `Core`, `Text`, `Comments`, `Events`, `Special Highlights`
- Label should be user-friendly (displayed in UI)
- Key must match TypeScript interface property exactly

### Step 4: Add CSS Variable Defaults

1. Open `src/styles/main.scss`
2. Add variables in **three locations** (order matters):

**Location A: `:root` (Light Mode Defaults)**
```scss
:root {
  --color-primary: #4f46e5;
  --color-bg: #f3f4f6;
  /* ... existing variables */
  
  /* Romantic scene highlighting */
  --romantic-text: #ec4899;
  --romantic-text-hover: #db2777;
  --romantic-bg: #fce7f3;
  --romantic-bg-hover: #fbcfe8;
}
```

**Location B: `@media (prefers-color-scheme: dark)` (System Dark Mode)**
```scss
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #818cf8;
    --color-bg: #1f2937;
    /* ... existing variables */
    
    /* Romantic scene highlighting - dark mode */
    --romantic-text: #f9a8d4;
    --romantic-text-hover: #fbcfe8;
    --romantic-bg: #831843;
    --romantic-bg-hover: #9f1239;
  }
}
```

**Location C: `html[data-theme="light"]` (Explicit Light Theme)**
```scss
html[data-theme="light"] {
  --color-primary: #4f46e5;
  --color-bg: #f3f4f6;
  /* ... existing variables */
  
  /* Romantic scene highlighting */
  --romantic-text: #ec4899;
  --romantic-text-hover: #db2777;
  --romantic-bg: #fce7f3;
  --romantic-bg-hover: #fbcfe8;
}
```

**Note:** `html[data-theme="dark"]` also exists but typically mirrors the `@media` dark values.

### Step 5: Use in Component Styles

Once CSS variables are defined, use them in your component SCSS modules:

**Example:** `src/components/organisms/ManuscriptEditor.module.scss`
```scss
.romanticHighlight {
  color: var(--romantic-text);
  background-color: var(--romantic-bg);
  border-radius: 4px;
  padding: 2px 4px;
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--romantic-text-hover);
    background-color: var(--romantic-bg-hover);
  }
}
```

## Testing Checklist

1. **Build Check**: Run `npm run build` - TypeScript should compile without errors
2. **Theme Toggle**: Switch between Light → Dark → Auto modes, verify colors adapt appropriately
3. **Configuration UI**: Open theme config modal (Palette icon in top bar)
   - Verify new color fields appear in the UI
   - Check they're grouped under correct category
   - Test color picker functionality
4. **Custom Theme**: 
   - Create a custom theme with your new colors
   - Save it with a name
   - Reload the application
   - Verify custom colors persist from localStorage
5. **Save File Persistence**:
   - Create or open a `.maria` project file
   - Customize new colors and save project
   - Close and reopen the file
   - Verify colors are restored from the save file
6. **Accessibility**: Use browser DevTools to verify contrast ratios meet WCAG AA (4.5:1)

## Common Patterns

### Hover States
Always include hover variants for interactive elements:
```typescript
'feature-text': string;
'feature-text-hover': string;
'feature-bg': string;
'feature-bg-hover': string;
```

### Border Colors
When adding bordered elements:
```typescript
'feature-border': string;
'feature-border-hover': string;
```

### State Variants
For elements with multiple states (active, disabled, etc.):
```typescript
'feature-active': string;
'feature-disabled': string;
'feature-focus': string;
```

## Troubleshooting

**Q: Colors not appearing in theme modal?**
- Verify `key` in `COLOR_OPTIONS` matches `ThemeColors` interface property exactly
- Check for typos (kebab-case with hyphens)

**Q: Light mode colors showing in dark mode?**
- Ensure all three CSS locations in `main.scss` are updated
- Check `@media (prefers-color-scheme: dark)` has dark-appropriate values

**Q: Custom theme not persisting?**
- Verify `src/utils/storage.ts` has correct version number
- Check browser console for localStorage errors
- Ensure `.maria` file format includes `themeCustomizations` array

**Q: TypeScript errors after adding properties?**
- Make new properties optional with `?` modifier
- Run `npm run type-check` to validate

## Example: Full Implementation

Here's a complete example adding "action scene" highlighting:

```typescript
// 1. ThemeContext.tsx - Interface
export interface ThemeColors {
  // ... existing
  'action-text'?: string;
  'action-text-hover'?: string;
  'action-bg'?: string;
  'action-bg-hover'?: string;
}

// 2. ThemeContext.tsx - Defaults
const lightTheme: ThemeColors = {
  // ... existing
  'action-text': '#dc2626',      // Red text
  'action-text-hover': '#b91c1c',
  'action-bg': '#fee2e2',         // Light red bg
  'action-bg-hover': '#fecaca',
};

const darkTheme: ThemeColors = {
  // ... existing
  'action-text': '#fca5a5',       // Light red for dark mode
  'action-text-hover': '#fecaca',
  'action-bg': '#7f1d1d',         // Deep red bg
  'action-bg-hover': '#991b1b',
};
```

```typescript
// 3. ThemeConfigModal.tsx
const COLOR_OPTIONS = [
  // ... existing options
  { key: 'action-text', label: 'Action Text', category: 'Special Highlights' },
  { key: 'action-text-hover', label: 'Action Text (Hover)', category: 'Special Highlights' },
  { key: 'action-bg', label: 'Action Background', category: 'Special Highlights' },
  { key: 'action-bg-hover', label: 'Action Background (Hover)', category: 'Special Highlights' },
];
```

```scss
/* 4. main.scss - All three locations */
:root {
  /* ... existing variables */
  --action-text: #dc2626;
  --action-text-hover: #b91c1c;
  --action-bg: #fee2e2;
  --action-bg-hover: #fecaca;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* ... existing variables */
    --action-text: #fca5a5;
    --action-text-hover: #fecaca;
    --action-bg: #7f1d1d;
    --action-bg-hover: #991b1b;
  }
}

html[data-theme="light"] {
  /* ... existing variables */
  --action-text: #dc2626;
  --action-text-hover: #b91c1c;
  --action-bg: #fee2e2;
  --action-bg-hover: #fecaca;
}
```

```scss
/* 5. Usage in component */
.actionHighlight {
  color: var(--action-text);
  background-color: var(--action-bg);
  
  &:hover {
    color: var(--action-text-hover);
    background-color: var(--action-bg-hover);
  }
}
```

## Quick Reference

| Step | File | Action |
|------|------|--------|
| 1 | `src/context/ThemeContext.tsx` | Add optional properties to `ThemeColors` interface |
| 2 | `src/context/ThemeContext.tsx` | Add values to `lightTheme` and `darkTheme` objects |
| 3 | `src/components/organisms/ThemeConfigModal.tsx` | Add entries to `COLOR_OPTIONS` array |
| 4 | `src/styles/main.scss` | Add CSS variables to `:root`, `@media dark`, and `[data-theme]` |
| 5 | Component SCSS files | Use `var(--your-color)` in styles |

---

**Last Updated:** January 2026  
**System Version:** 2.1
