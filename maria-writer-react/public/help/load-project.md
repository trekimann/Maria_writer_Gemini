# Load Project

The **Load Project** dialog lets you replace your current project with one loaded from a file or from the cloud. Your current project is automatically saved before the new one is loaded.

---

## Local File

Load a project from a `.maria` file previously exported from Maria Writer.

1. **Drag and drop** a `.maria` file onto the drop zone, or click **Browse Files** to select one.
2. The file is validated — you'll see the book version and app version extracted from the file, or an error if the file can't be read.
3. Click **Load File** to replace the current project.

> **Confirm prompt:** Because loading a local file permanently replaces your current session, you will be asked to confirm before proceeding.

### Version warnings

If the file was saved with an older version of Maria Writer that introduced breaking changes, an amber warning will appear describing what changed and confirming the project will still load correctly. The project will be re-saved using the current app version the next time you save.

If the file has no app version metadata (older exports), it will be assigned the current app version on load.

---

## Cloud

Load a project previously saved to the cloud.

> **Guest or signed-in — both work.** If you are using the app as a guest, your projects are identified by your **Guest ID**. If you are signed in to an account, your projects are linked to your profile. Either way, click **Refresh List** to see what's saved.

1. Click **Refresh List** to fetch your saved cloud projects.
2. Select a project from the list — each entry shows the project title, last updated time, and saved app version.
3. Click **Load Selected** to load it.

### Deleting a cloud project

Each row in the cloud project list has a **trash icon** on the right. Click it to open an inline confirmation panel directly below that row.

Because deletion is permanent and cannot be undone, you must:

1. Read the warning.
2. Tick the checkbox: **"I understand this project will be lost forever"**.
3. Click **Delete Permanently**.

Click **Cancel** (inside the confirmation panel) at any point to dismiss the panel without deleting.

> **Tip:** Export your project to a `.maria` file from **Save Settings → Export** before deleting if you want a local backup.

### Guest upsell notice

If you are not signed in, a notice will appear above the project list encouraging you to create a free account or sign in. Your projects are **not blocked** — this is just a reminder that linking projects to an account keeps them safe if your browser data is ever cleared.

### Before loading

The current project is automatically saved to local storage (and to the cloud, if cloud save is enabled) before the new project is loaded. If the auto-save fails, the load still continues — your project was most recently saved at the time shown in **Save Settings → Last Synced**.

### Version warnings

If the selected cloud project was saved with an older app version that introduced breaking changes, an amber warning appears below the selection. The project will load and will be encrypted under the current app version the next time you save it to the cloud.

---

## Tips

- To transfer a project to another device, export it as a `.maria` file from **Save Settings → Export**, then use **Load Project → Local File** on the other device.
- **Signed-in users:** your cloud projects follow your account — accessible from any device after logging in.
- **Guests:** cloud projects are tied to your **Guest ID** (visible in Save Settings). If your Guest ID changes (e.g. after clearing browser data), previously saved cloud projects will not appear in the list. Creating an account protects against this.
- Loading a project does not delete the previous project from the cloud — it only replaces what is currently loaded in the editor.

---

## Accounts

Cloud projects saved as a guest are stored under your Guest ID. When you **create an account or sign in**, future saves are linked to your profile instead, which means:

- Your projects are accessible from any browser or device after signing in
- You no longer risk losing access if browser data is cleared
- Your projects are still encrypted at rest

Use the **Sign in** or **Create a free account** links in the Cloud tab notice, or navigate to them from the main menu.

### Migrating guest projects after sign-in

When you log in or create an account, Maria Writer checks whether your previous guest session had any cloud projects saved. If it did, an **Import Guest Projects** dialog appears automatically.

1. The dialog lists your guest projects — all checked by default.
2. Uncheck any projects you want to leave behind.
3. Click **Migrate N projects** to move the selected ones to your account.
   - Each project is re-encrypted under your account key.
   - The link between those projects and your Guest ID is permanently removed — they can no longer be accessed as a guest.
4. Click **Skip for now** to dismiss the dialog without migrating. You can always do it manually by loading a guest project and re-saving it while signed in.

> **Why migrate?** Guest projects are tied to a Guest ID stored in your browser. If that ID is ever lost (browser reset, new device, etc.) you lose access. Migrated projects follow your account login instead.

### Signing out

When you sign out, your **Guest ID is automatically rotated** to a new random value. This prevents a new guest session from accidentally seeing or overwriting projects that belonged to your previous signed-in session. Your account projects are unaffected and remain accessible the next time you sign in.

After signing out, the editor restores the project state from your **last guest session** (the project that was open before you logged in). If no prior guest state exists, a blank new book is shown.

---

## Recovering Projects from Another Browser or Device

If you have cleared your browser data, switched to a new device, or otherwise lost access to your original session, you can restore access to your cloud-saved projects by entering the Guest ID from the original session.

[Recover my Guest ID](#recover-guest-id)

Once applied, open **Load Project → Cloud** and click **Refresh List** to see the projects saved under that ID.

> **Tip:** Create an account to avoid this entirely — signed-in users access their projects by logging in, not by tracking a Guest ID.
