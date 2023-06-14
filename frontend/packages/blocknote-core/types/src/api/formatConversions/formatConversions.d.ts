import { Schema } from "prosemirror-model";
import { Block, BlockSchema } from "../../extensions/Blocks/api/blockTypes";
export declare function blocksToHTML<BSchema extends BlockSchema>(blocks: Block<BSchema>[], schema: Schema): Promise<string>;
export declare function HTMLToBlocks<BSchema extends BlockSchema>(html: string, blockSchema: BSchema, schema: Schema): Promise<Block<BSchema>[]>;
export declare function blocksToMarkdown<BSchema extends BlockSchema>(blocks: Block<BSchema>[], schema: Schema): Promise<string>;
export declare function markdownToBlocks<BSchema extends BlockSchema>(markdown: string, blockSchema: BSchema, schema: Schema): Promise<Block<BSchema>[]>;
