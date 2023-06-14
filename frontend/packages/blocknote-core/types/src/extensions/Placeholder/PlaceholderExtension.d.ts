import { Editor, Extension } from "@tiptap/core";
import { Node as ProsemirrorNode } from "prosemirror-model";
/**
 * This is a modified version of the tiptap
 * placeholder plugin, that also sets hasAnchorClass
 *
 * It does not set a data-placeholder (text is currently done in css)
 *
 */
export interface PlaceholderOptions {
    emptyEditorClass: string;
    emptyNodeClass: string;
    isFilterClass: string;
    hasAnchorClass: string;
    placeholder: ((PlaceholderProps: {
        editor: Editor;
        node: ProsemirrorNode;
        pos: number;
        hasAnchor: boolean;
    }) => string) | string;
    showOnlyWhenEditable: boolean;
    showOnlyCurrent: boolean;
    includeChildren: boolean;
}
export declare const Placeholder: Extension<PlaceholderOptions, any>;
