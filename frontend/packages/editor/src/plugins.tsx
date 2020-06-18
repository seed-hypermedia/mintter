// import React from 'react'
import {
  BlockquotePlugin,
  BoldPlugin,
  HeadingPlugin,
  ImagePlugin,
  ItalicPlugin,
  LinkPlugin,
  ListPlugin,
  ParagraphPlugin,
  UnderlinePlugin,
  ExitBreakPlugin,
  SoftBreakPlugin,
} from '@udecode/slate-plugins'
import {nodeTypes} from './nodeTypes'

export const plugins = [
  BlockquotePlugin(nodeTypes),
  BoldPlugin(),
  HeadingPlugin(nodeTypes),
  ImagePlugin(nodeTypes),
  ItalicPlugin(),
  LinkPlugin(nodeTypes),
  ListPlugin(nodeTypes),
  ParagraphPlugin(nodeTypes),
  UnderlinePlugin(),
  ExitBreakPlugin(),
  SoftBreakPlugin(),
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
