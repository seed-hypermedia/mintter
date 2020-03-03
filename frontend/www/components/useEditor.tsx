import React from "react";
import { createEditor, Editor } from "slate";
import { withReact, ReactEditor } from "slate-react";
import withShortcuts from "@mintter/slate-plugin-with-shortcuts";
import withLinks from "@mintter/slate-plugin-with-links";
import { withBreakEmptyReset } from "slate-plugins-next";
import { withMarkdownParser } from "@horacioh/slate-plugin-with-markdown-parser";

const resetOptions = {
  types: [
    "list-item",
    "block-quote",
    "heading-one",
    "heading-two",
    "heading-three",
    "heading-four",
    "heading-five",
    "heading-six",
    "bulleted_list",
    "numbered_list",
    "link",
    "paragraph"
  ]
};

export default function useEditor(): Editor {
  return React.useMemo(
    () =>
      withMarkdownParser(
        withLinks(
          withShortcuts(
            withReact(withBreakEmptyReset(resetOptions)(createEditor()))
          )
        )
      ),

    []
  );
}
