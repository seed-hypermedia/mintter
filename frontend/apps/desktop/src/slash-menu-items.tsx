import { TwitterXIcon } from '@shm/ui'
import {
  RiArticleFill,
  RiCodeBoxFill,
  RiFile2Fill,
  RiFunctions,
  RiHeading,
  RiImage2Fill,
  RiMessage2Fill,
  RiText,
  RiVideoAddFill,
} from 'react-icons/ri'
import {
  BlockNoteEditor,
  HMBlockSchema,
  PartialBlock,
  insertOrUpdateBlock,
} from './editor'

export const slashMenuItems = [
  {
    name: 'Heading',
    aliases: ['h', 'heading1', 'subheading'],
    group: 'Text blocks',
    icon: <RiHeading size={18} />,
    execute: (editor) => {
      insertOrUpdateBlock(editor, {
        type: 'heading',
        props: { level: '2' },
      } as PartialBlock<HMBlockSchema>)
      const { state, view } = editor._tiptapEditor
      view.dispatch(state.tr.scrollIntoView())
    },
  },
  {
    name: 'Paragraph',
    aliases: ['p'],
    group: 'Text blocks',
    icon: <RiText size={18} />,
    execute: (editor) => {
      insertOrUpdateBlock(editor, {
        type: 'paragraph',
      } as PartialBlock<HMBlockSchema>)
      const { state, view } = editor._tiptapEditor
      view.dispatch(state.tr.scrollIntoView())
    },
  },
  {
    name: 'Code Block',
    aliases: ['code', 'pre', 'code-block', 'codeBlock'],
    group: 'Text blocks',
    icon: <RiCodeBoxFill size={18} />,
    hint: 'Insert a Code Block',
    execute: (editor: BlockNoteEditor) => {
      insertOrUpdateBlock(editor, {
        type: 'codeBlock',
        props: {
          language: '',
        },
      } as PartialBlock<HMBlockSchema>)
      const { state, view } = editor._tiptapEditor
      view.dispatch(state.tr.scrollIntoView())
    },
  },
  {
    name: 'Image',
    aliases: ['image', 'img', 'picture'],
    group: 'Media blocks',
    icon: <RiImage2Fill size={18} />,
    hint: 'Insert an Image',
    execute: (editor) => {
      insertOrUpdateBlock(
        editor,
        {
          type: 'image',
          props: {
            url: '',
            defaultOpen: 'true',
          },
        } as PartialBlock<HMBlockSchema>,
        true,
      )
      const { state, view } = editor._tiptapEditor
      view.dispatch(state.tr.scrollIntoView())
    },
  },
  {
    name: 'Video',
    aliases: ['video', 'vid', 'media'],
    group: 'Media blocks',
    icon: <RiVideoAddFill size={18} />,
    hint: 'Insert a Video',
    execute: (editor) => {
      insertOrUpdateBlock(
        editor,
        {
          type: 'video',
          props: {
            url: '',
            defaultOpen: 'true',
          },
        } as PartialBlock<HMBlockSchema>,
        true,
      )
      const { state, view } = editor._tiptapEditor
      view.dispatch(state.tr.scrollIntoView())
    },
  },
  {
    name: 'File',
    aliases: ['file', 'folder'],
    group: 'Media blocks',
    icon: <RiFile2Fill size={18} />,
    hint: 'Insert a File',
    execute: (editor) => {
      insertOrUpdateBlock(
        editor,
        {
          type: 'file',
          props: {
            url: '',
            defaultOpen: 'true',
          },
        } as PartialBlock<HMBlockSchema>,
        true,
      )
      const { state, view } = editor._tiptapEditor
      view.dispatch(state.tr.scrollIntoView())
    },
  },
  {
    name: 'Embed',
    aliases: ['embed', 'card'],
    group: 'Media blocks',
    icon: <RiArticleFill size={18} />,
    hint: 'Insert a Hypermedia Embed',
    execute: (editor) => {
      insertOrUpdateBlock(
        editor,
        {
          type: 'embed',
          props: {
            ref: '',
          },
        } as PartialBlock<HMBlockSchema>,
        true,
      )
      const { state, view } = editor._tiptapEditor
      view.dispatch(state.tr.scrollIntoView())
    },
  },
  {
    name: 'Math',
    aliases: ['math', 'mathematics', 'equation'],
    group: 'Media blocks',
    icon: <RiFunctions size={18} />,
    hint: 'Insert an Math Block',
    execute: (editor) => {
      insertOrUpdateBlock(
        editor,
        {
          type: 'math',
        } as PartialBlock<HMBlockSchema>,
        true,
      )
      const { state, view } = editor._tiptapEditor
      view.dispatch(state.tr.scrollIntoView())
    },
  },
  {
    name: 'Nostr',
    aliases: ['nostr', 'note', 'event'],
    group: 'Web embeds',
    icon: <RiMessage2Fill size={18} />,
    hint: 'Insert a nostr note',
    execute: (editor) => {
      insertOrUpdateBlock(
        editor,
        {
          type: 'nostr',
          props: {
            url: '',
          },
        } as PartialBlock<HMBlockSchema>,
        true,
      )
      const { state, view } = editor._tiptapEditor
      view.dispatch(state.tr.scrollIntoView())
    },
  },
  {
    name: 'X Post',
    aliases: ['tweet', 'twitter', 'x'],
    group: 'Web embeds',
    icon: <TwitterXIcon width={18} height={18} />,
    hint: 'Insert an X Post embed',
    execute: (editor) => {
      insertOrUpdateBlock(
        editor,
        {
          type: 'web-embed',
          props: {
            url: '',
          },
        } as PartialBlock<HMBlockSchema>,
        true,
      )
      const { state, view } = editor._tiptapEditor
      view.dispatch(state.tr.scrollIntoView())
    },
  },
]
