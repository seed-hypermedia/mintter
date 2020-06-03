import {useRouter} from 'next/router'
import {useMintter} from 'shared/mintterContext'

export function LibraryHeader() {
  const router = useRouter()
  const {createDraft} = useMintter()

  async function handleCreateDraft() {
    const d = await createDraft()

    const value = d.toObject()
    router.push({
      pathname: `/editor/${value.documentId}`,
    })
  }

  return (
    <div className="py-5 flex items-baseline justify-between">
      <h1 className="text-4xl font-bold text-heading">Library</h1>
      <button
        onClick={handleCreateDraft}
        className="bg-info hover:bg-info-hover text-white font-bold py-2 px-4 rounded rounded-full flex items-center justify-center transition duration-100"
      >
        new Draft
      </button>
    </div>
  )
}
