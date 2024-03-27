import {common, createLowlight} from 'lowlight'
import {
  BlockSchema,
  TypesMatch,
  defaultBlockSchema,
  defaultProps,
} from './blocknote'
import {EmbedBlock} from './embed-block'
import {FileBlock} from './file'
import {HMHeadingBlockContent} from './heading-component-plugin'
import {ImageBlock} from './image'
import {ImagePlaceholder} from './image-placeholder'
import {NostrBlock} from './nostr'
import CodeBlockLowlight from './tiptap-extension-code-block'
import {WebEmbed} from './web-embed'
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
  webEmbed: WebEmbed,
}

export type HMBlockSchema = TypesMatch<typeof hmBlockSchema>
