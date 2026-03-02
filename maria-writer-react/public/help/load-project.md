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

Load a project previously saved to the cloud by this browser/device.

1. Click **Refresh List** to fetch your saved cloud projects.
2. Select a project from the list — each entry shows the project title, last updated time, and saved app version.
3. Click **Load Selected** to load it.

### Before loading

The current project is automatically saved to local storage (and to the cloud, if cloud save is enabled) before the new project is loaded. If the auto-save fails, the load still continues — your project was most recently saved at the time shown in **Save Settings → Last Synced**.

### Version warnings

If the selected cloud project was saved with an older app version that introduced breaking changes, an amber warning appears below the selection. The project will load and will be encrypted under the current app version the next time you save it to the cloud.

---

## Tips

- To transfer a project to another device, export it as a `.maria` file from **Save Settings → Export**, then use **Load Project → Local File** on the other device.
- Cloud projects are tied to your **Guest ID** (visible in Save Settings). If your Guest ID changes (e.g. after clearing browser data), previously saved cloud projects will not appear in the list.
- Loading a project does not delete the previous project from the cloud — it only replaces what is currently loaded in the editor.

---

## Recovering Projects from Another Browser or Device

If you have cleared your browser data, switched to a new device, or otherwise lost access to your original session, you can restore access to your cloud-saved projects by entering the Guest ID from the original session.

[Recover my Guest ID](#recover-guest-id)

Once applied, open **Load Project → Cloud** and click **Refresh List** to see the projects saved under that ID.

> **Keep your Guest ID safe.** It is the only way to identify your cloud-saved projects until account login is available. Note it down from **Save Settings** while your projects are still accessible.
