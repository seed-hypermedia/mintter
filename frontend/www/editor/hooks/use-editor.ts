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
  // withDeserializeHTML,
  WithDeserializeHTMLOptions,
  deserializeHTMLToDocumentFragment,
  SlateDocumentDescendant,
} from '@udecode/slate-plugins'
import {withHistory} from 'slate-history'
import {autoformatRules} from '../autoformat-rules'
import {withMintter} from '../MintterPlugin'
import {withTransclusion} from '../TransclusionPlugin'

export function useEditor(plugins: any[], options): Editor {
  const withPlugins = [
    withReact,
    withHistory,
    withAutoformat({
      rules: autoformatRules,
    }),
    // withDeserializeMd(plugins),
    withDeserializeHTML({plugins}),
    withInlineVoid({plugins}),
    withTransclusion(options),
    withMintter(options),
  ] as const

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => pipe(createEditor(), ...withPlugins), [])
}

export const withDeserializeHTML = ({
  plugins = [],
}: WithDeserializeHTMLOptions = {}) => <T extends ReactEditor>(editor: T) => {
  const {insertData} = editor

  const inlineTypes = plugins.reduce((arr: string[], plugin) => {
    const types = plugin.inlineTypes || []
    return arr.concat(types)
  }, [])

  editor.insertData = (data: DataTransfer) => {
    const html = data.getData('text/html')

    if (html) {
      const {body} = new DOMParser().parseFromString(html, 'text/html')
      const prefragment = deserializeHTMLToDocumentFragment({
        plugins,
        element: body,
      })
      const fragment = prefragment.map(orphanTextNodesToBlock())
      const firstNodeType = fragment[0].type as string | undefined

      // replace the selected node type by the first block type
      if (firstNodeType && !inlineTypes.includes(firstNodeType)) {
        Transforms.setNodes(editor, {type: fragment[0].type})
      }
      Transforms.insertFragment(editor, fragment)
      // Editor.normalize(editor, {force: true})
      return
    }

    insertData(data)
  }

  return editor
}

export const orphanTextNodesToBlock = (defaultType = 'p') => (
  node: SlateDocumentDescendant,
) => {
  if (node.type === undefined) {
    return {
      type: defaultType,
      children: [node],
    }
  }

  return node
}
