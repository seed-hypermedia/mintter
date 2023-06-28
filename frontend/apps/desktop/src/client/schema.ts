import {BlockSchema, defaultBlockSchema, TypesMatch} from '@app/blocknote-core'
import {EmbedBlock} from '@app/embed-block'
import {FileBlock} from '@app/types/file'
import {ImageBlock} from '@app/types/image'

export const hdBlockSchema: BlockSchema = {
  paragraph: defaultBlockSchema.paragraph,
  heading: defaultBlockSchema.heading,
  image: ImageBlock,
  embed: EmbedBlock,
  file: FileBlock,
}

export type HDBlockSchema = TypesMatch<typeof hdBlockSchema>
