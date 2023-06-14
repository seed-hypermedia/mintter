import { BlockNoteEditor, DefaultProps } from '@mtt-blocknote/core';
type TextAlignment = DefaultProps['textAlignment']['values'][number];
export declare const TextAlignButton: <BSchema extends Record<string, import("@mtt-blocknote/core").BlockSpec<string, import("@mtt-blocknote/core").PropSchema>>>(props: {
    editor: BlockNoteEditor<BSchema>;
    textAlignment: TextAlignment;
}) => import("react/jsx-runtime").JSX.Element | null;
export {};
