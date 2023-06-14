import { Block, BlockNoteEditor, BlockSchema } from '@mtt-blocknote/core';
import { FC } from 'react';
import { DragHandleMenuProps } from './DragHandleMenu';
export type BlockSideMenuProps<BSchema extends BlockSchema> = {
    editor: BlockNoteEditor<BSchema>;
    block: Block<BSchema>;
    dragHandleMenu?: FC<DragHandleMenuProps<BSchema>>;
    addBlock: () => void;
    blockDragStart: (event: DragEvent) => void;
    blockDragEnd: () => void;
    freezeMenu: () => void;
    unfreezeMenu: () => void;
};
export declare const BlockSideMenu: <BSchema extends Record<string, import("@mtt-blocknote/core").BlockSpec<string, import("@mtt-blocknote/core").PropSchema>>>(props: BlockSideMenuProps<BSchema>) => import("react/jsx-runtime").JSX.Element;
