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
} from 'slate-plugins-next'
import {nodeTypes} from './nodeTypes'
// import {RenderLeafProps} from 'slate-react'

export const plugins = [
  BlockquotePlugin(nodeTypes),
  BoldPlugin(),
  HeadingPlugin(nodeTypes),
  ImagePlugin(nodeTypes),
  // InlineCodePlugin(),
  ItalicPlugin(),
  LinkPlugin(nodeTypes),
  ListPlugin(nodeTypes),
  ParagraphPlugin(nodeTypes),
  UnderlinePlugin(),
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
