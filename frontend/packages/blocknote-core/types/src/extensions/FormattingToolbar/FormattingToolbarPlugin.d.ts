import { Editor } from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { BlockNoteEditor, BlockSchema } from "../..";
import { FormattingToolbar, FormattingToolbarDynamicParams, FormattingToolbarFactory, FormattingToolbarStaticParams } from "./FormattingToolbarFactoryTypes";
export interface FormattingToolbarPluginProps<BSchema extends BlockSchema> {
    pluginKey: PluginKey;
    tiptapEditor: Editor;
    editor: BlockNoteEditor<BSchema>;
    formattingToolbarFactory: FormattingToolbarFactory<BSchema>;
}
export type FormattingToolbarViewProps<BSchema extends BlockSchema> = FormattingToolbarPluginProps<BSchema> & {
    view: EditorView;
};
export declare class FormattingToolbarView<BSchema extends BlockSchema> {
    editor: BlockNoteEditor<BSchema>;
    private ttEditor;
    view: EditorView;
    formattingToolbar: FormattingToolbar;
    preventHide: boolean;
    preventShow: boolean;
    toolbarIsOpen: boolean;
    prevWasEditable: boolean | null;
    shouldShow: (props: {
        view: EditorView;
        state: EditorState;
        from: number;
        to: number;
    }) => boolean;
    constructor({ editor, tiptapEditor, formattingToolbarFactory, view, }: FormattingToolbarViewProps<BSchema>);
    viewMousedownHandler: () => void;
    viewMouseupHandler: () => void;
    dragstartHandler: () => void;
    focusHandler: () => void;
    blurHandler: ({ event }: {
        event: FocusEvent;
    }) => void;
    scrollHandler: () => void;
    update(view: EditorView, oldState?: EditorState): void;
    destroy(): void;
    getSelectionBoundingBox(): DOMRect;
    getStaticParams(): FormattingToolbarStaticParams<BSchema>;
    getDynamicParams(): FormattingToolbarDynamicParams;
}
export declare const createFormattingToolbarPlugin: <BSchema extends Record<string, import("../..").BlockSpec<string, import("../..").PropSchema>>>(options: FormattingToolbarPluginProps<BSchema>) => Plugin<any>;
