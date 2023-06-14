import { BlockConfig, BlockSchema, BlockSpec, PropSchema } from '@mtt-blocknote/core';
import { FC, HTMLAttributes } from 'react';
export type ReactBlockConfig<Type extends string, PSchema extends PropSchema, ContainsInlineContent extends boolean, BSchema extends BlockSchema> = Omit<BlockConfig<Type, PSchema, ContainsInlineContent, BSchema>, 'render'> & {
    render: FC<{
        block: Parameters<BlockConfig<Type, PSchema, ContainsInlineContent, BSchema>['render']>[0];
        editor: Parameters<BlockConfig<Type, PSchema, ContainsInlineContent, BSchema>['render']>[1];
    }>;
};
export declare const InlineContent: (props: HTMLAttributes<HTMLDivElement>) => import("react/jsx-runtime").JSX.Element;
export declare function createReactBlockSpec<BType extends string, PSchema extends PropSchema, ContainsInlineContent extends boolean, BSchema extends BlockSchema>(blockConfig: ReactBlockConfig<BType, PSchema, ContainsInlineContent, BSchema>): BlockSpec<BType, PSchema>;
