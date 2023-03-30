import {useDaemonReady} from '@app/node-status-context'
import {draftsClient} from '@app/api-clients'
import {createDraftMachine, DraftActor} from '@app/draft-machine'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {queryKeys} from '@app/hooks'
import {
  createPublicationMachine,
  PublicationActor,
} from '@app/publication-machine'
import {appInvalidateQueries, appQueryClient} from '@app/query-client'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {QueryClient} from '@tanstack/react-query'
import {useMemo} from 'react'
import {toast} from 'react-hot-toast'
import {Editor} from 'slate'
import {interpret} from 'xstate'
import {useDocRepublish} from './sites'
import {useNavigate, useNavRoute} from '@app/utils/navigation'

export type MainActor =
  | {type: 'publication'; actor: PublicationActor}
  | {type: 'draft'; actor: DraftActor; editor: Editor}

export type MainActorOptions = Partial<{
  shouldAutosave: boolean
  editor: Editor
  client: QueryClient
}>

export function useMainActor(props: MainActorOptions = {}) {
  const republishDoc = useDocRepublish({
    onSuccess: (webPubs) => {
      if (!webPubs.length) return
      toast.success(
        `Document updated on ${webPubs
          .map((pub) => hostnameStripProtocol(pub.hostname))
          .join(', ')}`,
      )
    },
  })
  const isDaemonReady = useDaemonReady()

  const route = useNavRoute()
  const navReplace = useNavigate('replace')
  const {editor: inputEditor, shouldAutosave} = props

  return useMemo(() => {
    if (route.key === 'publication') {
      const pubMachine = createPublicationMachine({
        client: appQueryClient,
        documentId: route.documentId,
        version: route.versionId,
      }).withConfig({
        actions: {
          onEditSuccess: (_, event) => {
            navReplace({
              key: 'draft',
              documentId: event.data.id,
            })
          },
        },
      })
      const actor = interpret(pubMachine, {})
      actor.start()
      return {type: 'publication', actor} as const
    } else if (route.key === 'draft') {
      const editor = inputEditor ?? buildEditorHook(plugins, EditorMode.Draft)
      const draftMachine = createDraftMachine({
        client: appQueryClient,
        documentId: route.documentId,
        shouldAutosave: shouldAutosave || true,
        editor,
      }).withConfig({
        actions: {
          afterPublish: (c, event) => {
            console.log('===== PUBLISHING: AFTER PUBLISH ===', c, event)

            // invoke('emit_all', {
            //   event: 'document_published',
            // })
            const docId = event.data.document?.id
            if (!docId) return
            appInvalidateQueries([queryKeys.GET_PUBLICATION, docId])
            appInvalidateQueries([queryKeys.PUBLICATION_CHANGES, docId])
            appInvalidateQueries([queryKeys.PUBLICATION_CITATIONS])
            navReplace({
              key: 'publication',
              documentId: docId,
              versionId: event.data.version,
            })
            republishDoc.mutateAsync(event.data)
            toast.success('Draft published Successfully!')
          },
        },
        services: {
          publishDraft: (context) => {
            return draftsClient.publishDraft({
              documentId: context.documentId,
            })
          },
        },
        guards: {
          isDaemonReady: () => isDaemonReady,
        },
      })

      const actor = interpret(draftMachine, {})
      actor.start()
      return {type: 'draft', actor, editor} as const
    }
    return undefined
  }, [
    route,
    isDaemonReady,
    republishDoc,
    navReplace,
    inputEditor,
    shouldAutosave,
  ])
}
