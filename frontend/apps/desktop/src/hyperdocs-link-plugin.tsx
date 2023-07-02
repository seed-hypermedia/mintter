import {createHyperdocsDocLink} from '@mintter/shared'
import {combineTransactionSteps, getChangedRanges} from '@tiptap/core'
import {DecorationSet, EditorView} from '@tiptap/pm/view'
import {log} from 'console'
import {EditorState, Plugin, PluginKey} from 'prosemirror-state'
import {fetchWebLink} from './models/web-links'
import Link from './tiptap-extension-link'

export const hyperdocsPluginKey = new PluginKey('hyperdocs-link')

// TODO: use `createX` function instead of just exporting the plugin
export function createHyperdocsDocLinkPlugin() {
  let plugin = new Plugin({
    key: hyperdocsPluginKey,
    view(editorView) {
      return {
        update(view, prevState) {
          let state = plugin.getState(view.state)
          if (state?.size && state?.size > 0) {
            console.log('== ~ hdlink ~ state:', state)
            if (state) {
              for (const entry of state) {
                console.log('== ~ hdlink ~ update ~ for loop entry:', entry)
                checkHyperLink(view, entry)
              }
            }
          }
        },
      }
    },
    state: {
      init() {
        return new Map()
      },
      apply(tr, map, oldState, newState) {
        let removeKey: string = tr.getMeta('hdPlugin:removeId')
        if (removeKey) {
          map.delete(removeKey)
        }
        if (!tr.docChanged) return map
        let linkId = tr.getMeta('hdPlugin:uncheckedLink')
        if (!linkId) return map
        let markStep = tr.steps.find((step) => {
          if (step.jsonID == 'addMark') {
            let mark = step.toJSON().mark
            console.log('== ~ markStep ~ mark:', mark)
            if (mark.type == 'link' && mark.attrs.id == linkId) {
              console.log('== ~ hdlink is link mark: ', step.toJSON().mark)
              return true
            }
          }
          return false
        })

        if (!markStep) return map
        console.log('== ~ hdlink ~ markStep:', markStep)
        let mark = markStep.toJSON().mark
        console.log('== ~ hdlink ~ mark:', mark)
        map.set(mark.attrs.id, mark.attrs.href)
        return map
      },
    },
  })

  return {
    plugin,
  }
}

async function checkHyperLink(
  view: EditorView,
  entry: [key: string, value: string],
): Promise<
  | {
      documentId: string
      versionId?: string
      blockId?: string
    }
  | undefined
> {
  let [id, entryUrl] = entry
  console.log('== ~ hdlink ~ CHECK LINK START:', entry)
  if (!entryUrl) return
  view.dispatch(view.state.tr.setMeta('hdPlugin:removeId', id))
  try {
    let res = await fetchWebLink(entryUrl)
    if (res && res.documentId) {
      view.state.doc.descendants((node, pos) => {
        if (node.marks.some((mark) => mark.attrs.id == id)) {
          console.log('== ~ hdlink ~ CHECK LINK RESOLVE:', res)
          let tr = view.state.tr
          tr.addMark(
            pos,
            pos + node.textContent.length,
            view.state.schema.mark('link', {
              href: createHyperdocsDocLink(
                res!.documentId!,
                res?.documentVersion || undefined,
              ),
            }),
          )
          tr.setMeta('hdPlugin:removeId', id)
          setTimeout(() => {
            view.dispatch(tr)
          }, 2000)
        }
      })
    } else {
      console.log('== ~ hdlink ~ CHECK LINK RESOLVE NO LINK:', res)
    }
  } catch (error) {
    console.log('== ~ hdlink ~ CHECK LINK ERROR:', error)
  }

  return
}
