import React from "react";
import { createEditor, Node } from "slate";
import { NextPage } from "next";
import { Slate, Editable, withReact } from "slate-react";
import Link from "../../../components/link";
const initialValue = [
  {
    type: "section",
    children: [
      {
        type: "paragraph",
        children: [
          {
            text: ""
          }
        ]
      }
    ]
  }
];

export default function Playground(): JSX.Element {
  const editor = React.useMemo(() => withReact(createEditor()), []);
  const [value, setValue] = React.useState<Node[]>(initialValue);

  return (
    <div className="">
      <div className="bg-gray-700 py-6">
        <div className="mx-auto max-w-3xl flex items-center">
          <h1 className="text-gray-200 text-4xl font-bold flex-1">
            Playground
          </h1>
          <span className="px-4 py-1">
            <Link href="/">Home</Link>
          </span>
          <span className="px-4 py-1">
            <Link href="/app/editor">Editor</Link>
          </span>
          <button
            className="bg-orange-500 text-white px-4 py-1 rounded-sm"
            onClick={() => setValue(initialValue)}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="py-6 mx-auto max-w-3xl">
        <Slate
          editor={editor}
          value={value}
          onChange={newValue => setValue(newValue)}
        >
          <Editable placeholder="start writing..." />
        </Slate>
      </div>
    </div>
  );
}
