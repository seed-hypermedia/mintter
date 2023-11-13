import {LinkMenuItem, BlockSchema, DefaultBlockSchema} from '@/blocknote/core'

export type ReactLinkMenuItem<
  BSchema extends BlockSchema = DefaultBlockSchema,
> = LinkMenuItem<BSchema>
