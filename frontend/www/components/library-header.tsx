import {useRouter} from 'next/router'
import {createDraft} from 'shared/drafts'

export function LibraryHeader() {
  const router = useRouter()

  async function handleCreateDraft() {
    await createDraft(async newDraft => {
      const value = newDraft.toObject()
      router.push({
        pathname: `/editor/${value.id}`,
      })
    })
  }

  return (
    <div className="py-5 flex items-baseline justify-between">
      <h1 className="text-4xl font-bold text-heading">Library</h1>
      <button
        onClick={handleCreateDraft}
        className="bg-info hover:bg-info-hover text-white font-bold py-2 px-4 rounded rounded-full flex items-center justify-center transition duration-200"
      >
        new Draft
      </button>
    </div>
  )
}
