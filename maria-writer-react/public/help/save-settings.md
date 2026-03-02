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

Cloud save is available to **all users** — no account required. Guests save under their Guest ID; signed-in users save under their account profile.

> **Authentication:** When you are signed in, cloud requests are sent with your session credentials so the server links them to your account. Guest requests are identified by your Guest ID instead. Switching between guest and signed-in state is handled automatically — you do not need to change any setting.

> **Encryption:** As of v2.3.0, cloud-saved project data is encrypted at rest using AES-256-GCM with a per-user derived key. Your manuscript text is never stored as plaintext in the database.

#### Cloud Identity

When cloud save is enabled, the panel shows your current identity:

| State | Shown | Description |
|-------|-------|-------------|
| **Guest** | Guest ID | Your unique anonymous identifier — generated on first use and stored in your browser. Projects are tied to this ID. |
| **Signed in** | Linked to your profile | Projects are stored against your account — accessible from any device after logging in. |
| **Both** | Last Synced | When the project was last successfully saved to the cloud. |
| **Both** | Project ID | A short preview of the cloud record ID (for debugging). |

#### Guest upsell notice

If cloud save is enabled and you are not signed in, a notice will appear below the checkbox with links to **Create a free account** or **Sign in**. Your saves are not blocked — this is a reminder that an account provides permanent, device-independent access to your projects.

---

## Account & Sign In

Creating an account upgrades your cloud save from Guest ID–based to profile-based:

- Access your projects from **any browser or device** by signing in
- No risk of losing projects if browser data is cleared
- Your display name, profile picture, and genre preferences are stored

Use the **Sign in** or **Create Account** links in the app header or in the cloud save notice.

### Migrating existing guest projects

When you log in or register, Maria Writer automatically detects any cloud projects saved under your current Guest ID. An **Import Guest Projects** dialog lets you choose which ones to move to your account.

- Migrated projects are re-encrypted under your account key.
- The guest ID link is removed — imported projects can no longer be accessed without signing in.
- Projects you skip remain under the guest ID until the ID is rotated (e.g. on next logout).

If you skip migration at login, you can still transfer a project manually: open it via **Load Project → Cloud** while signed in, then **Save Now** to write it to your account.

### Signing out

When you sign out, your **Guest ID is automatically rotated** to a new random value. This prevents a new guest session from accidentally seeing or overwriting projects that belonged to your previous signed-in session. Your account projects are unaffected and remain accessible the next time you sign in.

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
