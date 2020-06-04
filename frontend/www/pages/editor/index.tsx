import {useEffect} from 'react'
import {useRouter} from 'next/router'
import {useMintter} from 'shared/mintterContext'

export default function EditorIndexPage() {
  const router = useRouter()
  const {createDraft} = useMintter()
  useEffect(() => {
    async function redirect() {
      const d = await createDraft()

      const draft = d.toObject()
      router.replace({
        pathname: `/editor/${draft.documentId}`,
      })
    }

    redirect()
  }, [])
  return null
}
