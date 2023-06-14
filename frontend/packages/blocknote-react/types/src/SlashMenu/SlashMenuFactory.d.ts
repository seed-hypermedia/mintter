import { SuggestionsMenuFactory } from '@mtt-blocknote/core';
import { ReactSlashMenuItem } from './ReactSlashMenuItem';
import { MantineThemeOverride } from '@mantine/core';
export declare const createReactSlashMenuFactory: <BSchema extends Record<string, import("@mtt-blocknote/core").BlockSpec<string, import("@mtt-blocknote/core").PropSchema>>>(theme: MantineThemeOverride) => SuggestionsMenuFactory<ReactSlashMenuItem<BSchema>>;
