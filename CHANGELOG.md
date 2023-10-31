## 🔌 New Network Connectivity Panel

Rather than mixing Site peers into the "Contacts" page, there is a new panel that shows your connection status to all peers and the `hyper.media` gateway.

![Screenshot 2023-10-31 at 12 48 59 PM](https://github.com/MintterHypermedia/mintter/assets/1483597/1dac06ba-875e-4c76-a278-8e1f4d9f4fbc)

You can see the new panel by pressing the networking button on the left side of the footer.

## 🎉 More New Features

- Feedback showing the draft auto-save progress
- Draft now shows the "last update" time
- Congratulations dialog when user publishes their first document
- Developers: toggle display debug menu in dev settings
- Title bar for Linux now matches Windows, including the menu bar

## 🐛 Bug Fixes

- Fixed/Mitigated issues where the site stops responding
- Improved errors UI across the app
- Copy URL of p2p group documents no longer includes `undefined`
- Tab key now works correctly inside Code Blocks
- Images/videos/files correctly appear inside the draft
- Fixed dialog overlay, you can now click away from dialogs
- Document title input now handles special characters and is not hidden when window resizes
- Documents with long titles no longer have `...` at the end of the URL, when published to a group
- Fix payment split buttons in case where one recipient has the full amount
- Backend deprecated `/quic` protocol, now uses `/quic-v1`
- Backend added logging when re-providing content to the DHT
- Fixed invalid group doc version after publish

## 🚨 Known Issues

- OG Images have been temporarily disabled, to mitigate issues with server reliability
- Documents do not open via URL in the quick switcher, when the app has been freshly loaded
  - You can open the document by connecting to peers and waiting for the sync to complete.
