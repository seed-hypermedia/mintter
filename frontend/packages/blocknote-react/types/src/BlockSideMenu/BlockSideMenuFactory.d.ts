import { FC } from 'react';
import { BlockSideMenuDynamicParams, BlockSideMenuStaticParams } from '@mtt-blocknote/core';
import { MantineThemeOverride } from '@mantine/core';
import { DragHandleMenuProps } from './components/DragHandleMenu';
export declare const createReactBlockSideMenuFactory: <BSchema extends Record<string, import("@mtt-blocknote/core").BlockSpec<string, import("@mtt-blocknote/core").PropSchema>>>(theme: MantineThemeOverride, dragHandleMenu?: FC<DragHandleMenuProps<BSchema>>) => (staticParams: BlockSideMenuStaticParams<BSchema>) => import("@mtt-blocknote/core").EditorElement<BlockSideMenuDynamicParams<BSchema>>;
