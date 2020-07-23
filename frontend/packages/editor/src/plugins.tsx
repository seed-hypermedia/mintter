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
import {options} from './options'

export const plugins = [
  BlockquotePlugin(options),
  BoldPlugin(options),
  HeadingPlugin(options),
  ItalicPlugin(options),
  LinkPlugin(options),
  ListPlugin(),
  ParagraphPlugin(options),
  UnderlinePlugin(options),
  CodePlugin(options),
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
