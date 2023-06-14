import { ReactNode } from 'react';
import { Block, BlockSchema, BlockNoteEditor } from '@mtt-blocknote/core';
export type DragHandleMenuProps<BSchema extends BlockSchema> = {
    editor: BlockNoteEditor<BSchema>;
    block: Block<BSchema>;
    closeMenu: () => void;
};
export declare const DragHandleMenu: (props: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
