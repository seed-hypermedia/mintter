import { Editor } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import { HyperlinkToolbarFactory } from "./HyperlinkToolbarFactoryTypes";
export type HyperlinkToolbarPluginProps = {
    hyperlinkToolbarFactory: HyperlinkToolbarFactory;
};
export type HyperlinkToolbarViewProps = {
    editor: Editor;
    hyperlinkToolbarFactory: HyperlinkToolbarFactory;
};
export declare const createHyperlinkToolbarPlugin: (editor: Editor, options: HyperlinkToolbarPluginProps) => Plugin<any>;
