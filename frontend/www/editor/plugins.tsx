// import React from 'react'
import {
  BoldPlugin,
  ItalicPlugin,
  ParagraphPlugin,
  UnderlinePlugin,
  CodePlugin,
  StrikethroughPlugin,
} from '@udecode/slate-plugins'
import {options} from './options'
import {HierarchyPlugin} from './hierarchy-plugin/hierarchy-plugin'
import {TransclusionPlugin} from './transclusion-plugin/transclusion-plugin'
import {BlockPlugin} from './block-plugin/block-plugin'
import {ReadOnlyPlugin} from './readonly-plugin/readonly-plugin'
import {HeadingPlugin} from './heading-plugin/heading-plugin'
import {LinkPlugin} from './link-plugin/link-plugin'
import {ListPlugin} from './list-plugin/list-plugin'

export const plugins = [
  ParagraphPlugin(options),
  LinkPlugin(),
  BoldPlugin(options),
  CodePlugin(options),
  ItalicPlugin(options),
  UnderlinePlugin(options),
  StrikethroughPlugin(options),
  HierarchyPlugin(options),
  TransclusionPlugin(options),
  BlockPlugin(options),
  ReadOnlyPlugin(options),
  HeadingPlugin(options),
  ListPlugin(options),
]

export function createPlugins(options) {
  return [
    ParagraphPlugin(options),
    BoldPlugin(options),
    CodePlugin(options),
    ItalicPlugin(options),
    UnderlinePlugin(options),
    StrikethroughPlugin(options),
    HierarchyPlugin(options),
    TransclusionPlugin(options),
    BlockPlugin(options),
    ReadOnlyPlugin(options),
    HeadingPlugin(options),
    ListPlugin(options),
    LinkPlugin(),
  ]
}
