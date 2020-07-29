// import React from 'react'
import {
  BlockquotePlugin,
  BoldPlugin,
  HeadingPlugin,
  ItalicPlugin,
  LinkPlugin,
  ListPlugin,
  ParagraphPlugin,
  UnderlinePlugin,
  CodePlugin,
  CodeBlockPlugin,
  StrikethroughPlugin,
  ImagePlugin,
  SoftBreakPlugin,
  ELEMENT_CODE_BLOCK,
  ExitBreakPlugin,
  ELEMENT_H1,
  ELEMENT_H2,
  ELEMENT_H3,
  ELEMENT_H4,
  ELEMENT_H5,
  ELEMENT_H6,
} from '@udecode/slate-plugins'
import {options} from './options'
import {HelperPlugin} from './HelperPlugin'
// import {ELEMENT_BLOCK} from './elements'

const headingTypes = [
  ELEMENT_H1,
  ELEMENT_H2,
  ELEMENT_H3,
  ELEMENT_H4,
  ELEMENT_H5,
  ELEMENT_H6,
]

export const plugins = [
  ParagraphPlugin(options),
  BlockquotePlugin(options),
  HeadingPlugin(options),
  ImagePlugin(options),
  LinkPlugin(options),
  ListPlugin(options),
  CodeBlockPlugin(),
  BoldPlugin(options),
  CodePlugin(options),
  ItalicPlugin(options),
  UnderlinePlugin(options),
  StrikethroughPlugin(options),
  SoftBreakPlugin({
    rules: [
      {hotkey: 'shift+enter'},
      {
        hotkey: 'enter',
        query: {
          allow: [ELEMENT_CODE_BLOCK, options.blockquote.type],
        },
      },
    ],
  }),
  ExitBreakPlugin({
    rules: [
      {
        hotkey: 'mod+enter',
      },
      {
        hotkey: 'mod+shift+enter',
        before: true,
      },
      {
        hotkey: 'enter',
        query: {
          start: true,
          end: true,
          allow: headingTypes,
        },
      },
    ],
  }),
  HelperPlugin(),
]

// function InlineCodePlugin() {
//   return {
//     renderLeaf: ({typeInlineCode = nodeTypes.typeCode} = {}) => ({
//       children,
//       leaf,
//     }: RenderLeafProps) => {
//       if (leaf[typeInlineCode])
//         return <code className="IMACODEELEMENT">{children}</code>

//       return children
//     },
//   }
// }
