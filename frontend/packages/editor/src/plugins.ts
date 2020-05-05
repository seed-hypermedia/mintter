import {
  BlockquotePlugin,
  BoldPlugin,
  HeadingPlugin,
  ImagePlugin,
  InlineCodePlugin,
  ItalicPlugin,
  LinkPlugin,
  ListPlugin,
  ParagraphPlugin,
  UnderlinePlugin,
} from 'slate-plugins-next'
import {nodeTypes} from './nodeTypes'

export const plugins = [
  BlockquotePlugin(nodeTypes),
  BoldPlugin(),
  HeadingPlugin(nodeTypes),
  ImagePlugin(nodeTypes),
  InlineCodePlugin(),
  ItalicPlugin(),
  LinkPlugin(nodeTypes),
  ListPlugin(nodeTypes),
  ParagraphPlugin(nodeTypes),
  UnderlinePlugin(),
]
