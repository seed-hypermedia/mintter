import {
  BlockSchema,
  defaultBlockSchema,
  TypesMatch,
} from '@mintter/app/src/blocknote-core'
import {EmbedBlock} from '@mintter/app/src/editor/embed-block'
import {FileBlock} from '@mintter/app/src/editor/file'
import {ImageBlock} from '@mintter/app/src/editor/image'
import {VideoBlock} from '@mintter/app/src/editor/video'

export const hmBlockSchema: BlockSchema = {
  paragraph: defaultBlockSchema.paragraph,
  heading: defaultBlockSchema.heading,
  image: ImageBlock,
  embed: EmbedBlock,
  video: VideoBlock,
  file: FileBlock,
}

export type HMBlockSchema = TypesMatch<typeof hmBlockSchema>
