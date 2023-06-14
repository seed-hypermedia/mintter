import { BaseSlashMenuItem, BlockNoteEditor, BlockSchema } from '@mtt-blocknote/core';
export declare class ReactSlashMenuItem<BSchema extends BlockSchema> extends BaseSlashMenuItem<BSchema> {
    readonly name: string;
    readonly execute: (editor: BlockNoteEditor<BSchema>) => void;
    readonly aliases: string[];
    readonly group: string;
    readonly icon: JSX.Element;
    readonly hint?: string | undefined;
    readonly shortcut?: string | undefined;
    constructor(name: string, execute: (editor: BlockNoteEditor<BSchema>) => void, aliases: string[], group: string, icon: JSX.Element, hint?: string | undefined, shortcut?: string | undefined);
}
