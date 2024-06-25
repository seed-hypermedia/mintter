import {
  BaseSlashMenuItem,
  BlockSchema,
  DefaultBlockSchema,
} from '@shm/desktop/src/editor/blocknote/core'

export type ReactSlashMenuItem<
  BSchema extends BlockSchema = DefaultBlockSchema,
> = BaseSlashMenuItem<BSchema> & {
  group: string
  icon: JSX.Element
  hint?: string
  shortcut?: string
}
