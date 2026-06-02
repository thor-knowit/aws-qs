# AWS Quick Switch

AWS Quick Switch is a Chrome extension for keeping a small catalog of AWS switch-role targets and opening them quickly from a popup.

## What It Does

- Search targets by display name, role name, account ID, account alias, or folder path.
- Browse targets in a nested folder tree.
- Pin frequently used targets and keep a recent list in the popup.
- Open a target in a new tab using AWS Switch Role.
- Optionally auto-submit the AWS Switch Role page with per-target source-session matching.
- Set an optional destination path so a target opens on a specific AWS page after switching.
- Manage folders and targets from the settings page.
- Import and export your saved data as JSON.

## Install

1. Run `npm install`.
2. Run `npm run build`.
3. Open `chrome://extensions`.
4. Enable Developer mode.
5. Choose `Load unpacked` and select the `dist` folder.

## Configure Targets

Open the popup, then open Settings from the gear icon.

For each target you can set:

- `Display Name`: the label shown in the popup.
- `Account ID`: the 12-digit AWS account ID or account alias used for switching.
- `Account Alias`: an optional label to make search and browsing clearer.
- `Role Name`: the AWS role to switch into.
- `Destination Path`: an optional AWS Console path such as `/console/home`.
- `Source Account` / `Source Identity`: optional text used to choose the AWS session to switch from when multiple sessions are active.
- `Parent Folder`: optional folder placement.

The extension starts with sample data the first time it is installed. Replace or remove it as needed.

## Use

- Open the popup from the extension icon.
- Type in the search box to filter targets instantly.
- Use `Arrow Up` / `Arrow Down` to move through search results.
- Press `Enter` to open the selected target in a new tab.
- Press `Escape` to clear the search.
- Use the star to pin or unpin a target.
- Use the edit icon to jump straight to that folder or target in Settings.

The extension also defines a suggested shortcut:

- Windows/Linux: `Ctrl+Shift+A`
- macOS: `Command+Shift+A`

You can change shortcuts in `chrome://extensions/shortcuts`.

## Settings

The settings page lets you:

- Create, edit, move, reorder, and delete folders.
- Create, edit, move, reorder, pin, launch, and delete targets.
- Configure global switch behavior, and optional source-session matching per target.
- Import or export JSON backups.

Export and import include both the catalog and usage data, including pinned and recent targets.

## Source Sessions

Open Settings and choose a target to set its optional `Source Account` and `Source Identity`. The account can be written with or without AWS's dashes. When auto-submit is enabled, selecting that target opens the AWS Switch Role page, chooses the matching source card if AWS presents one, and clicks `Switch Role`.

Targets without source-session values do not guess between multiple active AWS sessions. If AWS asks which session to switch from, the page remains available for manual selection.

Hold `Shift` while clicking a target or pressing `Enter` in search to leave the AWS Switch Role page manual for that launch.
