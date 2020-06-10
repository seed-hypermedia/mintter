import {useHistory} from 'react-router-dom'
import {useMintter} from 'shared/mintterContext'

export function LibraryHeader() {
  const history = useHistory()
  const {createDraft} = useMintter()

  async function handleCreateDraft() {
    const d = await createDraft()

    const value = d.toObject()
    history.push({
      pathname: `/editor/${value.documentId}`,
    })
  }

  return (
    <div className="py-5 flex items-baseline justify-between">
      {/* <h1 className="text-4xl font-bold text-heading">Library</h1> */}
      <button
        onClick={handleCreateDraft}
        className="bg-info hover:bg-info-hover text-white font-bold py-2 px-4 rounded rounded-full flex items-center justify-center transition duration-100"
      >
        new Document
      </button>
    </div>
  )
}
