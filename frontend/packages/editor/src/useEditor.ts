import React from 'react'
import {
  createEditor,
  Editor,
  // Transforms, Node, Element, Path
} from 'slate'
import {withReact} from 'slate-react'
import {
  withBreakEmptyReset,
  withDeleteStartReset,
  withShortcuts,
  withList,
  withImage,
  withDeserializeHtml,
  withLink,
  withBlock,
  withDeserializeMd,
  BLOCKQUOTE,
  HeadingType,
  pipe,
} from 'slate-plugins-next'
import {withSections} from './SectionPlugin'
import {nodeTypes} from './nodeTypes'
import {withHistory} from 'slate-history'

const resetOptions = {
  types: [BLOCKQUOTE, HeadingType.H1, HeadingType.H2, HeadingType.H3],
}

export function useEditor(plugins: any[]): Editor {
  const withPlugins = [
    withReact,
    withHistory,
    withLink(nodeTypes),
    withBlock(nodeTypes),
    withDeserializeMd(plugins),
    withDeserializeHtml(plugins),
    withImage(nodeTypes),
    withSections(),
    withBreakEmptyReset(resetOptions),
    withList(nodeTypes),
    withShortcuts(nodeTypes),
    withDeleteStartReset(resetOptions),
  ] as const

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => pipe(createEditor(), ...withPlugins), [])
}
