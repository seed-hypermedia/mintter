import {BlockSchema, defaultBlockSchema} from '@app/blocknote-core'
import {EmbedBlock} from '@app/embed-block'
import {FileBlock} from '@app/types/file'
import {ImageBlock} from '@app/types/image'

export const hdBlockSchema: BlockSchema = {
  paragraph: defaultBlockSchema.paragraph,
  heading: defaultBlockSchema.heading,
  image: ImageBlock,
  embedBlock: EmbedBlock,
  file: FileBlock,
}
