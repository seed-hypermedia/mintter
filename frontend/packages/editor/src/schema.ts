import {
  BlockSchema,
  TypesMatch,
  defaultBlockSchema,
  defaultProps,
} from './blocknote'
import {CodeBlock} from './code-block'
import {EmbedBlock} from './embed-block'
import {FileBlock} from './file'
import {HMHeadingBlockContent} from './heading-component-plugin'
import {ImageBlock} from './image'
import {ImagePlaceholder} from './image-placeholder'
import {NostrBlock} from './nostr'
import {VideoBlock} from './video'

export const hmBlockSchema: BlockSchema = {
  paragraph: defaultBlockSchema.paragraph,
  // heading: defaultBlockSchema.heading,
  heading: {
    propSchema: {},
    node: HMHeadingBlockContent,
  },
  image: ImageBlock,
  imagePlaceholder: {
    propSchema: {
      ...defaultProps,
      src: {default: ''},
      title: {default: ''},
    },
    node: ImagePlaceholder,
  },
  codeBlock: {
    propSchema: {
      ...defaultProps,
      language: {default: ''},
    },
    node: CodeBlock,
  },
  embed: EmbedBlock,
  video: VideoBlock,
  file: FileBlock,
  nostr: NostrBlock,
}

export type HMBlockSchema = TypesMatch<typeof hmBlockSchema>
