import "./blocknote/core/style.css";
import {BlockNoteView} from "./blocknote";
import {HyperDocsEditor} from "@mintter/app/src/models/documents";
import {YStack} from "@mintter/ui";
import "./editor.css";

export function HyperMediaEditorView({editor}: {editor: HyperDocsEditor}) {
  return <BlockNoteView editor={editor} />;
}

export function HMEditorContainer({children}: {children: React.ReactNode}) {
  return <YStack className="editor">{children}</YStack>;
}
