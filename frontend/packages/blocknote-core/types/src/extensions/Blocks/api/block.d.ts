import { Attribute } from "@tiptap/core";
import { BlockConfig, BlockSchema, BlockSpec, PropSchema, TipTapNode, TipTapNodeConfig } from "./blockTypes";
export declare function camelToDataKebab(str: string): string;
export declare function propsToAttributes<BType extends string, PSchema extends PropSchema, ContainsInlineContent extends boolean, BSchema extends BlockSchema>(blockConfig: Omit<BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>, "render">): Record<string, Attribute>;
export declare function parse<BType extends string, PSchema extends PropSchema, ContainsInlineContent extends boolean, BSchema extends BlockSchema>(blockConfig: Omit<BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>, "render">): {
    tag: string;
}[];
export declare function render<BType extends string, PSchema extends PropSchema, ContainsInlineContent extends boolean, BSchema extends BlockSchema>(blockConfig: Omit<BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>, "render">, HTMLAttributes: Record<string, any>): {
    dom: HTMLDivElement;
    contentDOM: HTMLDivElement;
} | {
    dom: HTMLDivElement;
    contentDOM?: undefined;
};
export declare function createBlockSpec<BType extends string, PSchema extends PropSchema, ContainsInlineContent extends boolean, BSchema extends BlockSchema>(blockConfig: BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>): BlockSpec<BType, PSchema>;
export declare function createTipTapBlock<Type extends string>(config: TipTapNodeConfig<Type>): TipTapNode<Type>;
