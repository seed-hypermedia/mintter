import {
  BlockSchema,
  defaultBlockSchema,
  TypesMatch,
} from '@mintter/app/src/blocknote-core'
import {EmbedBlock} from '@mintter/app/src/editor/embed-block'
import {FileBlock} from '@mintter/app/src/editor/file'
import {ImageBlock} from '@mintter/app/src/editor/image'

export const hdBlockSchema: BlockSchema = {
  paragraph: defaultBlockSchema.paragraph,
  heading: defaultBlockSchema.heading,
  image: ImageBlock,
  embed: EmbedBlock,
  file: FileBlock,
}

export type HDBlockSchema = TypesMatch<typeof hdBlockSchema>
