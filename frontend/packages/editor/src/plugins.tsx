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
  ExitBreakPlugin,
  SoftBreakPlugin,
  CodePlugin,
  CodeBlockPlugin,
} from '@udecode/slate-plugins'
import {nodeTypes} from './nodeTypes'

export const plugins = [
  BlockquotePlugin(nodeTypes),
  BoldPlugin(),
  HeadingPlugin(nodeTypes),
  ItalicPlugin(nodeTypes),
  LinkPlugin(nodeTypes),
  ListPlugin(nodeTypes),
  ParagraphPlugin(nodeTypes),
  UnderlinePlugin(),
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
          allow: [nodeTypes.typeH1, nodeTypes.typeH2, nodeTypes.typeH3],
        },
      },
    ],
  }),
  SoftBreakPlugin({
    rules: [
      {hotkey: 'shift+enter'},
      {
        hotkey: 'enter',
        query: {
          allow: [
            nodeTypes.typeCodeBlock,
            nodeTypes.typeBlockquote,
            nodeTypes.typeTd,
          ],
        },
      },
    ],
  }),
  CodePlugin(),
  CodeBlockPlugin(nodeTypes),
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
