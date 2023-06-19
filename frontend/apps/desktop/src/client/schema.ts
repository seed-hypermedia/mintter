import {ImageBlock} from '@app/types/image'
import {BlockSchema, defaultBlockSchema} from '@app/blocknote-core'

export const hdBlockSchema: BlockSchema = {
  paragraph: defaultBlockSchema.paragraph,
  heading: defaultBlockSchema.heading,
  image: ImageBlock,
  // numberedListItem: defaultBlockSchema.numberedListItem,
  // bulletListItem: defaultBlockSchema.bulletListItem,
}
