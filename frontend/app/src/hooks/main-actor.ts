import {QueryClient} from '@tanstack/react-query'
import {createDraftMachine, DraftActor} from '@app/draft-machine'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {
  createPublicationMachine,
  PublicationActor,
} from '@app/publication-machine'
import {appQueryClient} from '@app/query-client'
import {publishDraft} from '@mintter/shared'
import {useMemo} from 'react'
import {toast} from 'react-hot-toast'
import {Editor} from 'slate'
import {useLocation, useRoute} from 'wouter'
import {interpret} from 'xstate'
import {useDocRepublish} from './sites'

export type MainActor =
  | {type: 'publication'; actor: PublicationActor}
  | {type: 'draft'; actor: DraftActor; editor: Editor}

export type MainActorOptions = Partial<{
  shouldAutosave: boolean
  editor: Editor
  client: QueryClient
  //TODO: add proper type
  publishDraft: any
}>

export function useMainActor(props: MainActorOptions = {}) {
  const republishDoc = useDocRepublish()
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
      return {type: 'publication', actor} as const
    } else if (isDraft) {
      const editor = props.editor ?? buildEditorHook(plugins, EditorMode.Draft)
      const draftMachine = createDraftMachine({
        client: props.client ?? appQueryClient,
        documentId: draftParams.id,
        shouldAutosave: props.shouldAutosave || true,
        editor,
      }).withConfig({
        actions: {
          afterPublish: (_, event) => {
            console.log('draftMachine afterPublish')

            // invoke('emit_all', {
            //   event: 'document_published',
            // })
            setLocation(`/p/${event.data.document?.id}/${event.data.version}`, {
              replace: true,
            })
            toast.success('Draft published Successfully!')
          },
        },
        services: {
          // @ts-ignore
          publishDraft: props.publishDraft
            ? props.publishDraft
            : async (context) => {
                console.log('draftMachine publishDraft', context)

                const pub = await publishDraft(context.documentId)
                await republishDoc.mutateAsync(pub)
                return pub
              },
        },
      })

      const actor = interpret(draftMachine, {})
      actor.start()
      return {type: 'draft', actor, editor} as const
    }
    return undefined
  }, [
    isPublication,
    isDraft,
    publicationParams?.id,
    publicationParams?.version,
    draftParams?.id,
  ])
}
