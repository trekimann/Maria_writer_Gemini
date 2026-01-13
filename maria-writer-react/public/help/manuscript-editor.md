# Manuscript Editor

The **Manuscript Editor** is the central place for writing your story. It supports writing, source code editing, and previewing formatted text.

## View Modes

You can switch between three view modes using the buttons in the top right:

- **Write**: The default rich-text-like editing experience. Supports formatting shortcuts and visual aids.
- **Source**: Edit the raw Markdown text. Useful for precise control.
- **Preview**: View the rendered document as it would appear when exported.

## Formatting Tools

The toolbar provides standard formatting options:
- **Headings**: H1, H2, H3 for chapter titles and section breaks.
- **Text Styles**: **Bold**, *Italic*, and Underline.
- **Comments**: Add comments to specific text (or use standard Markdown syntax).

## Context Menu Features

Right-clicking in the editor opens a custom context menu with powerful tools:

### Create Event
Turn a selection of text into a Timeline Event instantly.
1. **Select** the text describing the event (e.g., "The explosion rocked the ship").
2. **Right-click** and choose **Create event**.
3. The **Event Modal** will open with the description pre-filled.
   - If character names are detected in the text, they will be auto-selected.
   - The date will default to the current chapter's date.
4. **Save** the event. 
   - The text in the editor will be **underlined in green**.
   - Hovering over it highlights the text.
   - A timeline entry is created automatically.
   - *Note*: If you cancel creation, the green highlight is removed.

### Auto-tag Characters
Automatically detects character names in your text and tags them.
- This creates links between the text and your character database.
- Tagged characters appear highlighted in the editor.

### Copy / Paste
Standard clipboard operations that work seamlessly across Write and Source modes.

## Statistics
At the bottom of the editor, you'll see real-time statistics:
- **Word Count**
- **Character Count**
- **Reading Time**

