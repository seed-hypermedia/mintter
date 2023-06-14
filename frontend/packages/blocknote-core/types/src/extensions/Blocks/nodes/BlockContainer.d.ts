import { Node } from "@tiptap/core";
import { BlockSchema, PartialBlock } from "../api/blockTypes";
export interface IBlock {
    HTMLAttributes: Record<string, any>;
}
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        block: {
            BNCreateBlock: (pos: number) => ReturnType;
            BNDeleteBlock: (posInBlock: number) => ReturnType;
            BNMergeBlocks: (posBetweenBlocks: number) => ReturnType;
            BNSplitBlock: (posInBlock: number, keepType: boolean) => ReturnType;
            BNUpdateBlock: <BSchema extends BlockSchema>(posInBlock: number, block: PartialBlock<BSchema>) => ReturnType;
            BNCreateOrUpdateBlock: <BSchema extends BlockSchema>(posInBlock: number, block: PartialBlock<BSchema>) => ReturnType;
        };
    }
}
/**
 * The main "Block node" documents consist of
 */
export declare const BlockContainer: Node<IBlock, any>;
