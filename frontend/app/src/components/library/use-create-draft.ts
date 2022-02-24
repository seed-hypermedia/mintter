import { createDraft as apiCreateDraft, Document } from "@app/client"
import { useMainPage } from "@app/main-page-context"
import { useLocation } from "wouter"

export function useCreateDraft() {
  const mainPageService = useMainPage()
  const [, setLocation] = useLocation()

  function createDraft(callback?: () => void) {
    try {
      apiCreateDraft().then(function createDraftSuccess(newDraft: Document) {
        callback?.()
        mainPageService.send('RECONCILE')
        setLocation(`/editor/${newDraft.id}`)
      })
    } catch (err) {
      throw Error(`new Draft error: ${err}`)
    }
  }

  return { createDraft }

}