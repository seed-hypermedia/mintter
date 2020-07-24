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
  // ExitBreakPlugin,
  // SoftBreakPlugin,
  CodePlugin,
  CodeBlockPlugin,
  StrikethroughPlugin,
  ImagePlugin,
  ExitBreakPlugin,
  SoftBreakPlugin,
  ELEMENT_CODE_BLOCK,
} from '@udecode/slate-plugins'
import {options} from './options'
import {ELEMENT_BLOCK} from './elements'

export const plugins = [
  BlockquotePlugin(options),
  BoldPlugin(options),
  HeadingPlugin(options),
  ItalicPlugin(options),
  LinkPlugin(options),
  ListPlugin(options),
  ParagraphPlugin(options),
  UnderlinePlugin(options),
  CodePlugin(options),
  CodeBlockPlugin(),
  StrikethroughPlugin(options),
  ImagePlugin(options),
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
          allow: [
            options.h1.type,
            options.h2.type,
            options.h3.type,
            ELEMENT_BLOCK,
          ],
        },
      },
    ],
  }),
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
