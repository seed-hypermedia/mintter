import {
  BlockNoteEditor,
  HMBlockSchema,
  PartialBlock,
  insertOrUpdateBlock,
} from '@mintter/editor'
import {
  RiArticleFill,
  RiCodeBoxFill,
  RiFile2Fill,
  RiHeading,
  RiImage2Fill,
  RiText,
  RiVideoAddFill,
} from 'react-icons/ri'

export const slashMenuItems = [
  {
    name: 'Heading',
    aliases: ['h', 'heading1', 'subheading'],
    group: 'Text blocks',
    icon: <RiHeading size={18} />,
    execute: (editor) =>
      insertOrUpdateBlock(editor, {
        type: 'heading',
        props: {level: '2'},
      } as PartialBlock<HMBlockSchema>),
  },
  {
    name: 'Paragraph',
    aliases: ['p'],
    group: 'Text blocks',
    icon: <RiText size={18} />,
    execute: (editor) =>
      insertOrUpdateBlock(editor, {
        type: 'paragraph',
      } as PartialBlock<HMBlockSchema>),
  },
  {
    name: 'Code Block',
    aliases: ['code', 'pre', 'code-block', 'codeBlock'],
    group: 'Text blocks',
    icon: <RiCodeBoxFill size={18} />,
    hint: 'Insert a Code Block',
    execute: (editor: BlockNoteEditor) =>
      insertOrUpdateBlock(editor, {
        type: 'codeBlock',
        props: {
          language: '',
        },
      } as PartialBlock<HMBlockSchema>),
  },
  {
    name: 'Image',
    aliases: ['image', 'img', 'picture'],
    group: 'Media blocks',
    icon: <RiImage2Fill size={18} />,
    hint: 'Insert an Image',
    execute: (editor) =>
      insertOrUpdateBlock(editor, {
        type: 'image',
        props: {
          url: '',
        },
      } as PartialBlock<HMBlockSchema>),
  },
  {
    name: 'Video',
    aliases: ['video', 'vid', 'media'],
    group: 'Media blocks',
    icon: <RiVideoAddFill size={18} />,
    hint: 'Insert a Video',
    execute: (editor) =>
      insertOrUpdateBlock(editor, {
        type: 'video',
        props: {
          url: '',
        },
      } as PartialBlock<HMBlockSchema>),
  },
  {
    name: 'File',
    aliases: ['file', 'folder'],
    group: 'Media blocks',
    icon: <RiFile2Fill size={18} />,
    hint: 'Insert a File',
    execute: (editor) =>
      insertOrUpdateBlock(editor, {
        type: 'file',
        props: {
          url: '',
        },
      } as PartialBlock<HMBlockSchema>),
  },
  {
    name: 'Embed',
    aliases: ['embed', 'card'],
    group: 'Media blocks',
    icon: <RiArticleFill size={18} />,
    hint: 'Insert an Embed',
    execute: (editor) =>
      insertOrUpdateBlock(editor, {
        type: 'embed',
        props: {
          ref: '',
        },
      } as PartialBlock<HMBlockSchema>),
  },
]
