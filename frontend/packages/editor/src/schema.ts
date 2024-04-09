import {common, createLowlight} from 'lowlight'
import {
  BlockSchema,
  TypesMatch,
  defaultBlockSchema,
  defaultProps,
} from './blocknote'
import {EmbedBlock} from './embed-block'
import {EquationBlock} from './equation'
import {FileBlock} from './file'
import {HMHeadingBlockContent} from './heading-component-plugin'
import {ImageBlock} from './image'
import {ImagePlaceholder} from './image-placeholder'
import {NostrBlock} from './nostr'
import CodeBlockLowlight from './tiptap-extension-code-block'
import {VideoBlock} from './video'
import {WebEmbed} from './web-embed'

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
    // @ts-ignore
    node: CodeBlockLowlight.configure({
      defaultLanguage: 'plaintext',
      lowlight: createLowlight(common),
      languageClassPrefix: 'language-',
    }),
  },
  embed: EmbedBlock,
  video: VideoBlock,
  file: FileBlock,
  nostr: NostrBlock,
  ['web-embed']: WebEmbed,
  equation: EquationBlock,
}

export type HMBlockSchema = TypesMatch<typeof hmBlockSchema>
