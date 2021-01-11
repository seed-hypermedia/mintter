import React from 'react'
import {
  createEditor,
  Editor,
  Transforms,
  // Node, Element, Path
} from 'slate'
import {withReact, ReactEditor} from 'slate-react'
import {
  withAutoformat,
  // withDeserializeHTML,
  pipe,
  withInlineVoid,
  // WithDeserializeHTMLOptions,
  // deserializeHTMLToDocumentFragment,
} from '@udecode/slate-plugins'
import {withHistory} from 'slate-history'
import {autoformatRules} from '../editor/autoformat-rules'
import {withMintter} from '../editor/mintter-plugin/with-mintter'
import {withTransclusion} from '../editor/transclusion-plugin/with-transclusion'

export function useEditor(plugins: any[], options): Editor {
  const withPlugins = [
    withReact,
    withHistory,
    withAutoformat({
      rules: autoformatRules,
    }),
    // withDeserializeMd(plugins),
    withInlineVoid({plugins}),
    withTransclusion(options),
    withMintter({plugins, options}),
  ] as const

  return React.useMemo(() => pipe(createEditor(), ...withPlugins), [])
}
