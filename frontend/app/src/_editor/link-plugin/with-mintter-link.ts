import * as mock from '@mintter/client/mocks'
import {SPEditor, upsertLinkAtSelection, WithOverride, someNode, isUrl, insertNodes} from '@udecode/slate-plugins'
import type {MenuStateReturn} from 'reakit/Menu'
import {Editor, Transforms} from 'slate'
import type {ReactEditor} from 'slate-react'
import {ELEMENT_QUOTE} from '../quote-plugin'
import type {EditorQuote} from '../types'
import {ELEMENT_LINK, MINTTER_LINK_PREFIX} from './create-link-plugin'

export interface WithMintterLinkOptions {
  menu?: MenuStateReturn
}

export function withMintterLink(options: WithMintterLinkOptions): WithOverride<ReactEditor & SPEditor> {
  return (editor) => {
    const {insertData, insertText, normalizeNode} = editor

    editor.insertData = (data) => {
      const text = data.getData('text/plain')
      const link = {url: text, wrap: false}

      if (text) {
        if (someNode(editor, {match: {type: ELEMENT_LINK}})) {
          return insertText(text)
        }

        if (text.includes(MINTTER_LINK_PREFIX)) {
          // console.log('this is a mintter link => ', text, options.menu)
          // options.menu?.show()

          // return upsertLinkAtSelection(editor, link)
          Editor.withoutNormalizing(editor, () => {
            insertNodes<EditorQuote>(editor, {
              id: mock.createId(),
              type: 'quote',
              url: text,
              children: [{text: ''}],
            })
          })
          return
        }

        if (isUrl(text)) {
          // console.log('link inserted at => ', editor.selection)
          return upsertLinkAtSelection(editor, link)
        }
      }

      insertData(data)
    }

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (node.type === ELEMENT_LINK) {
        if (!node.id) {
          Transforms.setNodes(editor, {id: mock.createId()}, {at: path})
          return
        }
      }

      normalizeNode(entry)
    }

    return editor
  }
}
