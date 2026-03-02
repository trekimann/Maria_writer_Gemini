# Save Settings

The **Save Settings** panel controls how and when your project is saved. Open it from the toolbar save icon.

---

## Storage Location

### Browser (Local Storage)
Your project is **always** saved to your browser's local storage — this cannot be turned off. Local saves are instant and work offline, but they are tied to this browser on this device.

### Cloud Save (MariaDB)
Enable **"Also save to Cloud"** to back up your project to the server database. Cloud saves:
- Happen when you click **Save Now**
- Happen automatically if any auto-save option is enabled
- Allow you to load the project from any device via **Load Project → Cloud**

> **Encryption:** As of v2.3.0, cloud-saved project data is encrypted at rest using AES-256-GCM with a per-user derived key. Your manuscript text is never stored as plaintext in the database.

#### Cloud Identity

When cloud save is enabled, you'll see:

| Field | Description |
|-------|-------------|
| **Guest ID** | Your unique anonymous identifier — generated on first use and stored in your browser. This is used as your encryption key identity. Keep a note of it if you want to recover your project on a new device before accounts are available. |
| **Last Synced** | When the project was last successfully saved to the cloud. |
| **Project ID** | A short preview of the cloud record's ID (for debugging purposes). |

---

## Auto-Save Options

| Option | Behaviour |
|--------|-----------|
| **Save when switching chapters** | Triggers a save each time you navigate to a different chapter in the sidebar. |
| **Save at regular intervals** | Saves automatically every N minutes while the app is open. Default is 5 minutes; adjust between 1 and 60. |
| **Save when switching to another window** | Saves when the browser loses focus (e.g., you click away to another application). |

Auto-save writes to both local storage and cloud (if cloud is enabled). The sync status indicator at the bottom of the panel shows the result.

---

## Save Now

Click **Save Now** to immediately save to local storage and, if cloud is enabled, push the latest version to the cloud. The button shows **Saving...** while the cloud request is in progress.

---

## Export

Export your project as a `.maria` file — a portable JSON snapshot of your entire project (chapters, characters, events, timeline, relationships, and all settings).

1. Click **Export to .maria File**
2. Edit the file name if needed
3. Click **Download .maria** (or press Enter) to save the file to your computer

Use the exported file to:
- Create a manual backup
- Transfer your project to a different browser or device
- Share your project with another Maria Writer installation

To re-import a `.maria` file, use **Load Project → Local File**.

---

## Sync Status

The status line below the auto-save options reflects the current cloud sync state:

- *(no message)* — cloud save is off, or no sync has run yet
- **Syncing to cloud...** — a save is in progress
- **Last saved X minutes ago** — last successful cloud sync time
- **Error: ...** — the last cloud save failed; the error message is shown inline
