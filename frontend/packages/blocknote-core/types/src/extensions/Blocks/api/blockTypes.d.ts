/** Define the main block types **/
import { Node, NodeConfig } from "@tiptap/core";
import { BlockNoteEditor } from "../../../BlockNoteEditor";
import { InlineContent, PartialInlineContent } from "./inlineContentTypes";
export type TipTapNodeConfig<Name extends string, Options = any, Storage = any> = {
    [K in keyof NodeConfig<Options, Storage>]: K extends "name" ? Name : K extends "group" ? never : NodeConfig<Options, Storage>[K];
};
export type TipTapNode<Name extends string, Options = any, Storage = any> = Node<Options, Storage> & {
    name: Name;
    group: "blockContent";
};
export type PropSpec = {
    values?: readonly string[];
    default: string;
};
export type PropSchema = Record<string, PropSpec>;
export type Props<PSchema extends PropSchema> = {
    [PType in keyof PSchema]: PSchema[PType]["values"] extends readonly string[] ? PSchema[PType]["values"][number] : string;
};
export type BlockConfig<Type extends string, PSchema extends PropSchema, ContainsInlineContent extends boolean, BSchema extends BlockSchema> = {
    type: Type;
    readonly propSchema: PSchema;
    containsInlineContent: ContainsInlineContent;
    render: (
    /**
     * The custom block to render
     */
    block: SpecificBlock<BSchema & {
        [k in Type]: BlockSpec<Type, PSchema>;
    }, Type>, 
    /**
     * The BlockNote editor instance
     * This is typed generically. If you want an editor with your custom schema, you need to
     * cast it manually, e.g.: `const e = editor as BlockNoteEditor<typeof mySchema>;`
     */
    editor: BlockNoteEditor<BSchema & {
        [k in Type]: BlockSpec<Type, PSchema>;
    }>) => ContainsInlineContent extends true ? {
        dom: HTMLElement;
        contentDOM: HTMLElement;
    } : {
        dom: HTMLElement;
    };
};
export type BlockSpec<Type extends string, PSchema extends PropSchema> = {
    readonly propSchema: PSchema;
    node: TipTapNode<Type>;
};
export type TypesMatch<Blocks extends Record<string, BlockSpec<string, PropSchema>>> = Blocks extends {
    [Type in keyof Blocks]: Type extends string ? Blocks[Type] extends BlockSpec<Type, PropSchema> ? Blocks[Type] : never : never;
} ? Blocks : never;
export type BlockSchema = TypesMatch<Record<string, BlockSpec<string, PropSchema>>>;
type BlocksWithoutChildren<BSchema extends BlockSchema> = {
    [BType in keyof BSchema]: {
        id: string;
        type: BType;
        props: Props<BSchema[BType]["propSchema"]>;
        content: InlineContent[];
    };
};
export type Block<BSchema extends BlockSchema> = BlocksWithoutChildren<BSchema>[keyof BlocksWithoutChildren<BSchema>] & {
    children: Block<BSchema>[];
};
export type SpecificBlock<BSchema extends BlockSchema, BlockType extends keyof BSchema> = BlocksWithoutChildren<BSchema>[BlockType] & {
    children: Block<BSchema>[];
};
type PartialBlocksWithoutChildren<BSchema extends BlockSchema> = {
    [BType in keyof BSchema]: Partial<{
        id: string;
        type: BType;
        props: Partial<Props<BSchema[BType]["propSchema"]>>;
        content: PartialInlineContent[] | string;
    }>;
};
export type PartialBlock<BSchema extends BlockSchema> = PartialBlocksWithoutChildren<BSchema>[keyof PartialBlocksWithoutChildren<BSchema>] & Partial<{
    children: PartialBlock<BSchema>[];
}>;
export type BlockIdentifier = {
    id: string;
} | string;
export {};
