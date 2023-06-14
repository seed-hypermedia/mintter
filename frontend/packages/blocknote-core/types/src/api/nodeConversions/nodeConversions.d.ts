import { Node, Schema } from "prosemirror-model";
import { Block, BlockSchema, PartialBlock } from "../../extensions/Blocks/api/blockTypes";
import { PartialInlineContent } from "../../extensions/Blocks/api/inlineContentTypes";
/**
 * converts an array of inline content elements to prosemirror nodes
 */
export declare function inlineContentToNodes(blockContent: PartialInlineContent[], schema: Schema): Node[];
/**
 * Converts a BlockNote block to a TipTap node.
 */
export declare function blockToNode<BSchema extends BlockSchema>(block: PartialBlock<BSchema>, schema: Schema): Node;
/**
 * Convert a TipTap node to a BlockNote block.
 */
export declare function nodeToBlock<BSchema extends BlockSchema>(node: Node, blockSchema: BSchema, blockCache?: WeakMap<Node, Block<BSchema>>): Block<BSchema>;
