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
  pipe,
  withInlineVoid,
  withDeserializeMd,
} from '@udecode/slate-plugins'
import {withHistory} from 'slate-history'
import {autoformatRules} from './autoformatRules'
import {withMintter} from './MintterPlugin'
import {withTransclusion} from './TransclusionPlugin'

export function useEditor(plugins: any[], options): Editor {
  const withPlugins = [
    withReact,
    withHistory,
    withAutoformat({
      rules: autoformatRules,
    }),
    withDeserializeMd(plugins),
    withDeserializeHTML({plugins}),
    withInlineVoid({plugins}),
    withTransclusion(options),
    withMintter(options),
  ] as const

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => pipe(createEditor(), ...withPlugins), [])
}
