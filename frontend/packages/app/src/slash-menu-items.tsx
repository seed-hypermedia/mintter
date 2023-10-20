import {HMBlockSchema, PartialBlock, insertOrUpdateBlock} from '@mintter/editor'
import {
  RiFile2Fill,
  RiHeading,
  RiImage2Fill,
  RiText,
  RiVideoAddFill,
} from 'react-icons/ri'

export const slashMenuItems = [
  {
    name: 'Paragraph',
    aliases: ['p'],
    icon: <RiText size={18} />,
    execute: (editor) =>
      insertOrUpdateBlock(editor, {
        type: 'paragraph',
      } as PartialBlock<HMBlockSchema>),
  },
  {
    name: 'Heading',
    aliases: ['h', 'heading1', 'subheading'],
    icon: <RiHeading size={18} />,
    execute: (editor) =>
      insertOrUpdateBlock(editor, {
        type: 'heading',
        props: {level: '2'},
      } as PartialBlock<HMBlockSchema>),
  },
  {
    name: 'Image',
    aliases: ['image', 'img', 'picture'],
    icon: <RiImage2Fill size={18} />,
    hint: 'Insert a Image',
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
    icon: <RiVideoAddFill size={18} />,
    hint: 'Insert a video',
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
]
