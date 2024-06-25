import {fetchWebLink} from '@/models/web-links'
import {AppQueryClient} from '@/query-client'
import {extractBlockRefOfUrl, hmIdWithVersion} from '@shm/shared'
import {EditorView} from '@tiptap/pm/view'
import {Plugin, PluginKey} from 'prosemirror-state'

export const hypermediaPluginKey = new PluginKey('hypermedia-link')

// TODO: use `createX` function instead of just exporting the plugin
export function createHypermediaDocLinkPlugin({
  queryClient,
}: {
  queryClient: AppQueryClient
}) {
  let plugin = new Plugin({
    key: hypermediaPluginKey,
    view(editorView) {
      return {
        update(view, prevState) {
          let state = plugin.getState(view.state)
          if (state?.size && state?.size > 0) {
            if (state) {
              for (const entry of state) {
                checkHyperLink(queryClient, view, entry)
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
        let removeKey: string = tr.getMeta('hmPlugin:removeId')
        if (removeKey) {
          map.delete(removeKey)
        }
        if (!tr.docChanged) return map
        let linkId = tr.getMeta('hmPlugin:uncheckedLink')
        if (!linkId) return map
        let markStep = tr.steps.find((step) => {
          if (step.jsonID == 'addMark') {
            let mark = step.toJSON().mark
            if (mark.type == 'link' && mark.attrs.id == linkId) {
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
  queryClient: AppQueryClient,
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
  view.dispatch(view.state.tr.setMeta('hmPlugin:removeId', id))
  try {
    let res = await fetchWebLink(queryClient, entryUrl)
    if (res && res.hmId) {
      const fullHmId = hmIdWithVersion(
        res.hmId,
        res.hmVersion,
        extractBlockRefOfUrl(entryUrl),
      )
      view.state.doc.descendants((node, pos) => {
        if (node.marks.some((mark) => mark.attrs.id == id)) {
          let tr = view.state.tr
          tr.addMark(
            pos,
            pos + node.textContent.length,
            view.state.schema.mark('link', {
              href: fullHmId,
            }),
          )
          tr.setMeta('hmPlugin:removeId', id)

          view.dispatch(tr)
        }
      })
    }
  } catch (error) {
    console.error(`Editor: hm-link check error: ${error}`)
  }

  return
}
