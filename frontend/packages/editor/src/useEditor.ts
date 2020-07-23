import React from 'react'
import {
  createEditor,
  Editor,
  // Transforms, Node, Element, Path
} from 'slate'
import {withReact} from 'slate-react'
import {
  withResetBlockType,
  withAutoformat,
  withList,
  withDeserializeHTML,
  withLink,
  withToggleType,
  withDeserializeMd,
  pipe,
  withInlineVoid,
  // withTransforms,
} from '@udecode/slate-plugins'
import {withSections} from './SectionPlugin'
import {nodeTypes} from './nodeTypes'
import {withHistory} from 'slate-history'
import {withImageBlock} from './ImageBlockPlugin'
import {withHelper} from './HelperPlugin'
import {autoformatRules} from './autoformatRules'

// need this object because the plugin required it, I made an issue in the plugin's repo
const resetOptions = {
  types: [nodeTypes.typeBlockquote, nodeTypes.typeCodeBlock],
  defaultType: nodeTypes.typeP,
}

export function useEditor(plugins: any[]): Editor {
  const withPlugins = [
    withReact,
    withHistory,
    withLink(),
    withDeserializeHTML({plugins}),
    withToggleType({defaultType: nodeTypes.typeP}),
    withList(),
    withAutoformat({
      rules: autoformatRules,
    }),
    // withTransforms(),
    withDeserializeMd(plugins),
    withResetBlockType(resetOptions),
    withInlineVoid({plugins}),
    withImageBlock(),
    withHelper(),
    withInlineVoid({plugins}),
    withSections(),
  ] as const

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => pipe(createEditor(), ...withPlugins), [])
}
