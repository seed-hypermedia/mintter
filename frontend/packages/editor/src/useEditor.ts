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
  // withDeserializeMd,
  pipe,
  withInlineVoid,
  ELEMENT_CODE_BLOCK,
  withTransforms,
} from '@udecode/slate-plugins'
// import {nodeTypes} from './nodeTypes'
import {withHistory} from 'slate-history'
import {withImageBlock} from './ImageBlockPlugin'
import {autoformatRules} from './autoformatRules'
import {options} from './options'
import {withBlocks} from './BlockPlugin'

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
    withToggleType({defaultType: options.p.type}),
    withResetBlockType(resetOptions),
    withList(options),
    withAutoformat({
      rules: autoformatRules,
    }),
    withTransforms(),
    // withDeserializeMd(plugins),
    withInlineVoid({plugins}),
    withImageBlock(),
    withInlineVoid({plugins}),
    withBlocks(),
  ] as const

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => pipe(createEditor(), ...withPlugins), [])
}
