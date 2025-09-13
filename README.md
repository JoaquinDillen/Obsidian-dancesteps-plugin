<div align="center">
  <img src="src/media/dancestepsplugin.png" alt="Dance Steps Plugin Logo" width="500">

  **A Dance Steps Library Plugin for Obsidian**

</div>


# Dance Repository (Obsidian Plugin)

Browse and organize your dance practice videos inside Obsidian. Dance Repository adds a dedicated “Dance Library” view with a fast, phone‑style grid, powerful search and filters, and a fullscreen viewer. Edit step metadata and (optionally) auto‑organize new videos into a clean folder structure.

## Screen Preview
![Main view](src/media/Screens%20View.png)

## Features

- Library view with search, filters, and sort (by class, dance, style)
- Responsive grid of video cards with quick actions (play, edit, delete)
- Fullscreen video viewer with scrubbing, previous/next navigation, and mute
- Edit step metadata; persisted in sidecar Markdown frontmatter next to videos
- Import new videos from a file picker (saved into your vault)
- Optional auto‑organize of new videos into a template‑based folder structure
- Ribbon icon and command to open the library quickly

## Installation

Manual (development/testing):
- Build the plugin or download a packaged release.
- Copy these files into your vault at `Vault/.obsidian/plugins/dancesteps/`:
  - `manifest.json`
  - `main.js`
  - `styles.css` (if present)
- In Obsidian, go to **Settings → Community plugins** and enable “Dance Repository”.

BRAT (optional):
- Install the [Obsidian BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin.
- Add this repository to BRAT to install pre‑release builds.

## Usage

- Open the library:
  - Click the ribbon icon (play circle), or
  - Run the command: “Open Dance Repository”.
- Use the search box and filter drawer to narrow steps by class, dance, or style.
- Click a card to select, or use the play button to open the fullscreen viewer.
- Edit a step via the ••• menu → Edit. Changes are saved to a sidecar `.md` file next to the video.
- Import videos using the “Add Step” button (file picker). The file is copied into your vault (see settings for destination/organization).

## Settings

- Root folder: Restrict scanning to this folder (blank = whole vault)
- Autoplay, Show controls: Default video behavior in the viewer
- Library root: Top‑level destination for organized videos (e.g., `Dance/`)
- Folder template: Subfolders under the library root (placeholders: `{dance}`, `{style}`, `{class}`)
- Filename template: Base filename for organized videos (placeholder: `{stepName}`)
- Auto‑organize new videos: When enabled, new videos are automatically copied/renamed under the library root using your templates
- Default filters: Optional comma‑separated defaults for classes, dances, and styles used by the library view

## Commands

- `open-dance-repository` — Open Dance Repository (also available via ribbon icon)

## Compatibility

- Requires Obsidian `minAppVersion` specified in `manifest.json`.
- Designed to work on desktop and mobile (`isDesktopOnly: false`).

## Privacy & Security

- The plugin operates locally and does not send your data to any external service.
- No telemetry. Any future optional integrations will be opt‑in and documented.
- Scope is limited to your vault; the plugin does not access files outside the vault.

## Development

Prerequisites:
- Node.js 18+ (LTS recommended)

Install and run:
- `npm install`
- `npm run dev` — development watch build
- `npm run build` — production build (bundles to `main.js`)

Project notes:
- TypeScript + esbuild bundle. Source lives under `src/`.
- Entry point is `main.ts` which loads the custom view defined in `src/view.tsx`.
- Release artifacts must include `manifest.json`, `main.js`, and optional `styles.css` at the plugin root.

## Releasing

1) Bump the version in `manifest.json` (SemVer). Update `versions.json` to map plugin version → minimum Obsidian version.
2) Create a GitHub release with a tag exactly matching `manifest.json` (no leading `v`).
3) Attach `manifest.json`, `main.js`, and `styles.css` (if present) as assets.

Tip: You can also use `npm version patch|minor|major` and then update `minAppVersion` as needed.

## Known Limitations

- Some platforms may not render a video frame thumbnail until playback starts. The grid falls back to an inline video preview when a still cannot be captured.

## License

This project is licensed under the MIT License. See `LICENSE` for details.
