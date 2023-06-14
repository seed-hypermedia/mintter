import { FormattingToolbarStaticParams, FormattingToolbarDynamicParams, BlockNoteEditor } from '@mtt-blocknote/core';
import { FC } from 'react';
import { MantineThemeOverride } from '@mantine/core';
export declare const createReactFormattingToolbarFactory: <BSchema extends Record<string, import("@mtt-blocknote/core").BlockSpec<string, import("@mtt-blocknote/core").PropSchema>>>(theme: MantineThemeOverride, toolbar?: FC<{
    editor: BlockNoteEditor<BSchema>;
}>) => (staticParams: FormattingToolbarStaticParams<BSchema>) => import("@mtt-blocknote/core").EditorElement<FormattingToolbarDynamicParams>;
