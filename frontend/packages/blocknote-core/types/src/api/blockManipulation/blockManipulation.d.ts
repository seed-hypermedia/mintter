import { Editor } from "@tiptap/core";
import { BlockIdentifier, BlockSchema, PartialBlock } from "../../extensions/Blocks/api/blockTypes";
export declare function insertBlocks<BSchema extends BlockSchema>(blocksToInsert: PartialBlock<BSchema>[], referenceBlock: BlockIdentifier, placement: "before" | "after" | "nested" | undefined, editor: Editor): void;
export declare function updateBlock<BSchema extends BlockSchema>(blockToUpdate: BlockIdentifier, update: PartialBlock<BSchema>, editor: Editor): void;
export declare function removeBlocks(blocksToRemove: BlockIdentifier[], editor: Editor): void;
export declare function replaceBlocks<BSchema extends BlockSchema>(blocksToRemove: BlockIdentifier[], blocksToInsert: PartialBlock<BSchema>[], editor: Editor): void;
