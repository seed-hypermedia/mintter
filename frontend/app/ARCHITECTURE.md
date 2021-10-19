# Architecture

## SSR

With traditional web apps, it's common to see loading times and blank screens before anything will be rendered to
screen. This doesn't feel very _native_ though, so it's important we optimize for a fast first-paint. We archieve this
through prerendering our entry points. The setup for this follows the
[vite SSR guide](https://vitejs.dev/guide/ssr.html) especially the
[react example](https://github.com/vitejs/vite/tree/main/packages/playground/ssr-react).

1. **Client Bundle**

   The client bundle is the optimized browser distribution of our frontend. It will be loaded in the app and will
   hydrate the prerendered html. It's entrypoint is [./src/entry-client.tsx](./src/entry-client.tsx). This file will be
   run in the browser so have access to browser/tauri specific APIs here.

2. Server Bundle

   The server bundle exports a function called `render` that takes a given URL and returns html. This bundle will be
   used in the 3rd step to prerender the app and discarded afterwards. It's entrypoint is
   [./src/entry-server.tsx](./src/entry-server.tsx). In this file you have access to all nodejs APIs and can do whatever
   is necessary to build the prerendered html (including pulling in data from somwhere).

   > The server bundle doesn't have access to browser/tauri APIs so all usage of that must be guarded with
   >
   > ```js
   > if (!import.meta.env.SSR) {
   >   // call browser/tauri APIs here
   > }
   > ```

3. Prerendering

   The last step is taking the server bundle and telling it to render a set number of routes (currently only `/`) and
   writing the resulting html to `dist/static`. This job is done by the [./prerender.mjs](./prerender.mjs) script.
