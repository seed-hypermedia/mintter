import {useEffect} from 'react'
import {useRouter} from 'next/router'
import {createDraft} from 'shared/drafts'

export default function EditorIndexPage() {
  const router = useRouter()
  useEffect(() => {
    async function redirect() {
      await createDraft(async newDraft => {
        const value = newDraft.toObject()
        router.replace({
          pathname: `/editor/${value.documentId}`,
        })
      })
    }

    redirect()
  }, [])
  return null
}
