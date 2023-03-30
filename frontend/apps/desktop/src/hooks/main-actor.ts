import { useDaemonReady } from '@app/node-status-context'
import { draftsClient } from '@app/api-clients'
import { createDraftMachine, DraftActor } from '@app/draft-machine'
import { buildEditorHook, EditorMode } from '@app/editor/plugin-utils'
import { plugins } from '@app/editor/plugins'
import { queryKeys } from '@app/hooks'
import { createPublicationMachine, PublicationActor } from '@app/publication-machine'
import { appInvalidateQueries, appQueryClient } from '@app/query-client'
import { hostnameStripProtocol } from '@app/utils/site-hostname'
import { QueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toast } from 'react-hot-toast'
import { Editor } from 'slate'
import { useLocation, useRoute } from 'wouter'
import { interpret } from 'xstate'
import { useDocRepublish } from './sites'

export type MainActor =
  | { type: 'publication'; actor: PublicationActor }
  | { type: 'draft'; actor: DraftActor; editor: Editor }

export type MainActorOptions = Partial<{
  shouldAutosave: boolean
  editor: Editor
  client: QueryClient
  // @ts-ignore
  publishDraft?: any
}>

export function useMainActor(props: MainActorOptions = {}) {
  const republishDoc = useDocRepublish({
    onSuccess: (webPubs) => {
      if (!webPubs.length) return
      toast.success(
        `Document updated on ${webPubs
          .map((pub) => hostnameStripProtocol(pub.hostname))
          .join(', ')}`
      )
    },
  })
  const isDaemonReady = useDaemonReady()
  const [, setLocation] = useLocation()
  const [isPublication, publicationParams] = useRoute('/p/:id/:version/:block?')
  const [isDraft, draftParams] = useRoute('/d/:id/:tag?')

  return useMemo(() => {
    if (isPublication) {
      const pubMachine = createPublicationMachine({
        client: appQueryClient,
        documentId: publicationParams.id,
        version: publicationParams.version,
      }).withConfig({
        actions: {
          onEditSuccess: (_, event) => {
            setLocation(`/d/${event.data.id}`)
          },
        },
      })
      const actor = interpret(pubMachine, {})
      actor.start()
      return { type: 'publication', actor } as const
    } else if (isDraft) {
      const editor = props.editor ?? buildEditorHook(plugins, EditorMode.Draft)
      const draftMachine = createDraftMachine({
        client: props.client ?? appQueryClient,
        documentId: draftParams.id,
        shouldAutosave: props.shouldAutosave || true,
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
            setLocation(`/p/${docId}/${event.data.version}`, {
              replace: true,
            })
            republishDoc.mutateAsync(event.data)
            toast.success('Draft published Successfully!')
          },
        },
        services: {
          // @ts-ignore
          publishDraft: props.publishDraft
            ? props.publishDraft
            : (context) => {
                console.log('===== PUBLISHING: PUBLISH SERVICE === ', context)

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
      return { type: 'draft', actor, editor } as const
    }
    return undefined
  }, [isPublication, isDraft, publicationParams?.id, publicationParams?.version, draftParams?.id])
}
