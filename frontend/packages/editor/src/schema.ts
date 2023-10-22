import {
  BlockSchema,
  TypesMatch,
  defaultBlockSchema,
  defaultProps,
} from './blocknote'
import {EmbedBlock} from './embed-block'
import {FileBlock} from './file'
import {ImageBlock} from './image'
import {ImagePlaceholder} from './imagePlaceholder'
import CodeBlock from './tiptap-extension-codeblock'
import {VideoBlock} from './video'

export const hmBlockSchema: BlockSchema = {
  paragraph: defaultBlockSchema.paragraph,
  heading: defaultBlockSchema.heading,
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
}

export type HMBlockSchema = TypesMatch<typeof hmBlockSchema>
