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
  pipe,
} from 'slate-plugins-next'
import {withSections} from './SectionPlugin'
import {nodeTypes} from './nodeTypes'
import {withHistory} from 'slate-history'

// need this object because the plugin required it, I made an issue in the plugin's repo
const resetOptions = {
  types: [
    nodeTypes.typeH1,
    nodeTypes.typeH2,
    nodeTypes.typeH3,
    nodeTypes.typeBlockquote,
    nodeTypes.typeCode,
  ],
  typeP: nodeTypes.typeP,
}

export function useEditor(plugins: any[]): Editor {
  const withPlugins = [
    withReact,
    withHistory,
    withLink(nodeTypes),
    withShortcuts(nodeTypes),
    withBlock(nodeTypes),
    withDeserializeMd(plugins),
    withDeserializeHtml(plugins),
    withImage(nodeTypes),
    withSections(),
    withBreakEmptyReset(resetOptions),
    withList(nodeTypes),
    withDeleteStartReset(resetOptions),
  ] as const

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => pipe(createEditor(), ...withPlugins), [])
}
