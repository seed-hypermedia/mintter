import { toPlainMessage } from "@bufbuild/protobuf";
import type { MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { queryClient } from "../client";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader = async () => {
  const siteInfo = await queryClient.website.getSiteInfo({})
  // const foo = await grpcClient.daemon.getInfo({})
  return { message: "Hello from loader data!" + JSON.stringify(toPlainMessage(siteInfo)) };
}

export default function Index() {
  const l = useLoaderData<typeof loader>()
  return (
    <div className="font-sans p-4">
      <h1 className="text-3xl">{l.message}</h1>
      <ul className="list-disc mt-4 pl-6 space-y-2">
        <li>
          <a
            className="text-blue-700 underline visited:text-purple-900"
            target="_blank"
            href="https://remix.run/start/quickstart"
            rel="noreferrer"
          >
            5m Quick Start
          </a>
        </li>
        <li>
          <a
            className="text-blue-700 underline visited:text-purple-900"
            target="_blank"
            href="https://remix.run/start/tutorial"
            rel="noreferrer"
          >
            30m Tutorial
          </a>
        </li>
        <li>
          <a
            className="text-blue-700 underline visited:text-purple-900"
            target="_blank"
            href="https://remix.run/docs"
            rel="noreferrer"
          >
            Remix Docs
          </a>
        </li>
      </ul>
    </div>
  );
}
