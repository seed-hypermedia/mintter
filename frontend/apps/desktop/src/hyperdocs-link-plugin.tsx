import {createHyperdocsDocLink} from '@mintter/shared'
import {EditorView} from '@tiptap/pm/view'
import {Plugin, PluginKey} from 'prosemirror-state'
import {fetchWebLink} from './models/web-links'

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
            if (state) {
              for (const entry of state) {
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
          // @ts-expect-error
          if (step.jsonID == 'addMark') {
            let mark = step.toJSON().mark
            if (mark.type == 'link' && mark.attrs.id == linkId) {
              console.log('== ~ hdlink is link mark: ', step.toJSON().mark)
              return true
            }
          }
          return false
        })

        if (!markStep) return map
        let mark = markStep.toJSON().mark
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
  if (!entryUrl) return
  view.dispatch(view.state.tr.setMeta('hdPlugin:removeId', id))
  try {
    let res = await fetchWebLink(entryUrl)
    if (res && res.documentId) {
      view.state.doc.descendants((node, pos) => {
        if (node.marks.some((mark) => mark.attrs.id == id)) {
          let tr = view.state.tr
          tr.addMark(
            pos,
            pos + node.textContent.length,
            view.state.schema.mark('link', {
              href: createHyperdocsDocLink(
                res!.documentId!,
                res?.documentVersion,
                res?.blockId,
              ),
            }),
          )
          tr.setMeta('hdPlugin:removeId', id)

          view.dispatch(tr)
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
