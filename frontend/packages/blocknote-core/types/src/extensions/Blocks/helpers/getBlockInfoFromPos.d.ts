import { Node, NodeType } from "prosemirror-model";
export type BlockInfo = {
    id: string;
    node: Node;
    contentNode: Node;
    contentType: NodeType;
    numChildBlocks: number;
    startPos: number;
    endPos: number;
    depth: number;
};
/**
 * Retrieves information regarding the most nested block node in a ProseMirror doc, that a given position lies in.
 * @param doc The ProseMirror doc.
 * @param posInBlock A position somewhere within a block node.
 * @returns A BlockInfo object for the block the given position is in, or undefined if the position is not in a block
 * for the given doc.
 */
export declare function getBlockInfoFromPos(doc: Node, posInBlock: number): BlockInfo | undefined;
