import {createTRPCProxyClient} from "@trpc/client";
import {ipcLink} from "electron-trpc/renderer";
import superjson from "superjson";
import type {AppRouter} from "./api";

export const client = createTRPCProxyClient<AppRouter>({
  links: [ipcLink()],
  transformer: superjson,
});
