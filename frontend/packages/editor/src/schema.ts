import {BlockSchema, TypesMatch, defaultBlockSchema} from './blocknote'
import {EmbedBlock} from './embed-block'
import {FileBlock} from './file'
import {ImageBlock} from './image'
import {VideoBlock} from './video'

export const hmBlockSchema: BlockSchema = {
  paragraph: defaultBlockSchema.paragraph,
  heading: defaultBlockSchema.heading,
  image: ImageBlock,
  embed: EmbedBlock,
  video: VideoBlock,
  file: FileBlock,
}

export type HMBlockSchema = TypesMatch<typeof hmBlockSchema>
