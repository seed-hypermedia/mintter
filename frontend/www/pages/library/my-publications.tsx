import {useRouter} from 'next/router'
import Seo from 'components/seo'
import NoteAddOutlinedIcon from '@material-ui/icons/NoteAddOutlined'
import DocumentList from 'components/documentList'
import Content from 'components/content'
import {MainLayout} from 'components/main-layout'
import {LibraryHeader} from 'components/library-header'
import {useMintter} from 'shared/mintterContext'
import {useProfile} from 'shared/profileContext'
import {useMemo} from 'react'

export default function MyPublications() {
  const router = useRouter()
  const {createDraft, allPublications} = useMintter()
  const {status, error, resolvedData} = allPublications()
  const {profile} = useProfile()

  async function handleCreateDraft() {
    const newDraft = await createDraft().toObject()
    router.push({
      pathname: `/editor/${newDraft.documentId}`,
    })
  }

  const myPubs = useMemo(
    () =>
      resolvedData
        ?.toObject()
        .publicationsList.filter(
          p => p.author === profile.toObject().accountId,
        ),
    [resolvedData],
  )

  return (
    <Content>
      <Seo title="My Publications" />
      <LibraryHeader />
      <DocumentList status={status} error={error} data={myPubs} />
      {status === 'success' && myPubs.length === 0 && (
        <>
          <div className="bg-background-muted border-muted border-solid border-2 rounded px-8 pt-6 pb-8 mb-4 text-center flex flex-col items-center mt-8">
            <h2 className="text-3xl font-semibold text-info">
              No Publications (yet)
            </h2>
            <button
              onClick={handleCreateDraft}
              className="bg-info hover:bg-info-hover text-white font-bold py-3 px-4 rounded rounded-full flex items-center mt-5 justify-center"
            >
              <NoteAddOutlinedIcon />
              <span className="ml-2">Create your first Draft</span>
            </button>
          </div>
          <hr className="border-t-2 border-muted border-solid my-8" />
        </>
      )}
    </Content>
  )
}

MyPublications.Layout = MainLayout
