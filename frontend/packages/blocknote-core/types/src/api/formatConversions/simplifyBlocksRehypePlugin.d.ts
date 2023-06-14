import { Parent as HASTParent } from "hast";
type SimplifyBlocksOptions = {
    orderedListItemBlockTypes: Set<string>;
    unorderedListItemBlockTypes: Set<string>;
};
/**
 * Rehype plugin which converts the HTML output string rendered by BlockNote into a simplified structure which better
 * follows HTML standards. It does several things:
 * - Removes all block related div elements, leaving only the actual content inside the block.
 * - Lifts nested blocks to a higher level for all block types that don't represent list items.
 * - Wraps blocks which represent list items in corresponding ul/ol HTML elements and restructures them to comply
 * with HTML list structure.
 * @param options Options for specifying which block types represent ordered and unordered list items.
 */
export declare function simplifyBlocks(options: SimplifyBlocksOptions): (tree: HASTParent) => void;
export {};
