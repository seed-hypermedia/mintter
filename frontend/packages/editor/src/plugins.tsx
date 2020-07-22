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
} from '@udecode/slate-plugins'

export const plugins = [
  BlockquotePlugin(),
  BoldPlugin(),
  HeadingPlugin(),
  ItalicPlugin(),
  LinkPlugin(),
  ListPlugin(),
  ParagraphPlugin(),
  UnderlinePlugin(),
  CodePlugin(),
  CodeBlockPlugin(),
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
