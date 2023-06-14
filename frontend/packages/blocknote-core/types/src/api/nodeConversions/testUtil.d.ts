import { Block, BlockSchema, PartialBlock } from "../../extensions/Blocks/api/blockTypes";
export declare function partialBlockToBlockForTesting<BSchema extends BlockSchema>(partialBlock: PartialBlock<BSchema>): Block<BSchema>;
