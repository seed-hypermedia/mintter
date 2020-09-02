import React from 'react'
import {
  createEditor,
  Editor,
  // Transforms, Node, Element, Path
} from 'slate'
import {withReact} from 'slate-react'
import {
  withAutoformat,
  withDeserializeHTML,
  withLink,
  withToggleType,
  // withDeserializeMd,
  pipe,
  withInlineVoid,
  withTransforms,
  withImageUpload,
} from '@udecode/slate-plugins'
// import {nodeTypes} from './nodeTypes'
import {withHistory} from 'slate-history'
import {autoformatRules} from './autoformatRules'
import {options} from './options'
import {withMintter} from './MintterPlugin'
import {withTransclusion} from './TransclusionPlugin'

// need this object because the plugin required it, I made an issue in the plugin's repo
// const resetOptions = {
//   types: [
//     options.blockquote.type,
//     ELEMENT_CODE_BLOCK,
//     options.h1.type,
//     options.h2.type,
//     options.h3.type,
//     options.img.type,
//   ],
//   defaultType: options.p.type,
// }

export function useEditor(plugins: any[]): Editor {
  const withPlugins = [
    withReact,
    withHistory,
    withLink(),
    withDeserializeHTML({plugins}),
    withToggleType({defaultType: options.p.type}),
    withAutoformat({
      rules: autoformatRules,
    }),
    withTransforms(),
    // withDeserializeMd(plugins),
    withInlineVoid({plugins}),
    withImageUpload(options),
    withTransclusion(options),
    withMintter(options),
  ] as const

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => pipe(createEditor(), ...withPlugins), [])
}
