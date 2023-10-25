## 🌋 Breaking Change: Editable Document Title

A structural change for documents: you can directly edit the document title. The title should be different than the first block of content, allowing for a more descriptive doc heirarchy.

For existing documents that have a matching heading block on the top of the document, we will hide the redundant heading block.

## 🧑‍💻 Code Blocks

New Block type for including code in your documents. You can create a Code Block by typing slash (`/`) in the editor and selecting "Code Block". As a shortcut, you can also type `\`\`\`` in the editor.

## 🔭 Improved Publication View

Publications are rendered in sites, in the app, and within doc embeds. Now we are sharing code between all the targets, so Publications be visually identical on all platforms.

## 🎉 More New Features

- [New Download Page](https://mintter.com/download-mintter-hypermedia) to get the latest version of the app
- "Clone Group" now allows copy and selection of existing group members
- Edit Profile dialog in My Profile page
- You can click on links inside embedded content without opening the embed first
- Developers: Test network for private dev work
- Developers: Enable debugging tools in app settings
- Developers: Draft logging to help diagnose draft save issues

## 🐛 Bug Fixes

- Onboarding: Mnemonics now show with a `space` delimiter, both when presented and copied to the clipboard
- Cleaned up unrelated features on "My Profile" page
- Fixed interaction issues in Onboarding. Removed the fancy✨ animations for now
- Fix the styles of the title bar in Windows and Linux
- Minor fixes to image caption styles
- Hidden "Latest Change" on site group because it was showing the group creation date
- Modal background/overlays fixed, you can now click away from modals

## 🚨 Known Issues

- Draft auto-saving is unreliable and sometimes results in lost content or unexpected results when committing
  - Please refresh the draft page with `Cmd-R` on a regular basis and before you commit
  - For important content, we reccommend you write the draft outside the app and copy it in
- Documents do not open via URL in the quick switcher, when the app has been freshly loaded
  - You can open the document by connecting to peers and waiting for the sync to complete.
- Code blocks do not support `tab` key correctly
  - You can paste code with indentation and it will appear correctly
