import { BlockNoteEditor, BlockNoteEditorOptions, BlockSchema } from '@mtt-blocknote/core';
import { DependencyList, FC } from 'react';
import { DragHandleMenuProps } from '../BlockSideMenu/components/DragHandleMenu';
type CustomElements<BSchema extends BlockSchema> = Partial<{
    formattingToolbar: FC<{
        editor: BlockNoteEditor<BSchema>;
    }>;
    dragHandleMenu: FC<DragHandleMenuProps<BSchema>>;
}>;
/**
 * Main hook for importing a BlockNote editor into a React project
 */
export declare const useBlockNote: <BSchema extends Record<string, import("@mtt-blocknote/core").BlockSpec<string, import("@mtt-blocknote/core").PropSchema>> = {
    readonly paragraph: {
        readonly propSchema: {
            backgroundColor: {
                default: "transparent";
            };
            textColor: {
                default: "black";
            };
            textAlignment: {
                default: "left";
                values: readonly ["left", "center", "right", "justify"];
            };
        };
        readonly node: import("@mtt-blocknote/core").TipTapNode<"paragraph", any, any>;
    };
    readonly heading: {
        readonly propSchema: {
            readonly level: {
                readonly default: "1";
                readonly values: readonly ["1", "2", "3"];
            };
            readonly backgroundColor: {
                default: "transparent";
            };
            readonly textColor: {
                default: "black";
            };
            readonly textAlignment: {
                default: "left";
                values: readonly ["left", "center", "right", "justify"];
            };
        };
        readonly node: import("@mtt-blocknote/core").TipTapNode<"heading", any, any>;
    };
    readonly bulletListItem: {
        readonly propSchema: {
            backgroundColor: {
                default: "transparent";
            };
            textColor: {
                default: "black";
            };
            textAlignment: {
                default: "left";
                values: readonly ["left", "center", "right", "justify"];
            };
        };
        readonly node: import("@mtt-blocknote/core").TipTapNode<"bulletListItem", any, any>;
    };
    readonly numberedListItem: {
        readonly propSchema: {
            backgroundColor: {
                default: "transparent";
            };
            textColor: {
                default: "black";
            };
            textAlignment: {
                default: "left";
                values: readonly ["left", "center", "right", "justify"];
            };
        };
        readonly node: import("@mtt-blocknote/core").TipTapNode<"numberedListItem", any, any>;
    };
}>(options?: Partial<BlockNoteEditorOptions<BSchema> & {
    customElements: Partial<{
        formattingToolbar: FC<{
            editor: BlockNoteEditor<BSchema>;
        }>;
        dragHandleMenu: FC<DragHandleMenuProps<BSchema>>;
    }>;
}>, deps?: DependencyList) => BlockNoteEditor<BSchema> | null;
export {};
