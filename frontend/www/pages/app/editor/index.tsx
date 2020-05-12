import {useEffect} from 'react'
import {useRouter} from 'next/router'
import {createDraft} from '../../../shared/drafts'

export default function EditorIndexPage() {
  const router = useRouter()
  console.log('EditorIndexPage -> router', router)

  useEffect(() => {
    async function redirect() {
      await createDraft(async newDraft => {
        const value = newDraft.toObject()
        router.replace({
          pathname: `/app/editor/${value.documentId}`,
        })
      })
    }

    redirect()
  }, [])
  return null
}
