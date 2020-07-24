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
  ELEMENT_CODE_BLOCK,
  // withTransforms,
} from '@udecode/slate-plugins'
import {withSections} from './SectionPlugin'
import {nodeTypes} from './nodeTypes'
import {withHistory} from 'slate-history'
import {withImageBlock} from './ImageBlockPlugin'
import {withHelper} from './HelperPlugin'
import {autoformatRules} from './autoformatRules'
import {options} from './options'

// need this object because the plugin required it, I made an issue in the plugin's repo
const resetOptions = {
  types: [options.blockquote.type, ELEMENT_CODE_BLOCK],
  defaultType: options.p.type,
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
