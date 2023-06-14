import { ReactSlashMenuItem } from '../ReactSlashMenuItem';
import { BlockSchema } from '@mtt-blocknote/core';
export type SlashMenuProps<BSchema extends BlockSchema> = {
    items: ReactSlashMenuItem<BSchema>[];
    keyboardHoveredItemIndex: number;
    itemCallback: (item: ReactSlashMenuItem<BSchema>) => void;
};
export declare function SlashMenu<BSchema extends BlockSchema>(props: SlashMenuProps<BSchema>): import("react/jsx-runtime").JSX.Element;
