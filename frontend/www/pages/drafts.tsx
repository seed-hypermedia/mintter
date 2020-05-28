import {Fragment, useState} from 'react'
import {useRouter} from 'next/router'
import Seo from '../components/seo'
import NoteAddOutlinedIcon from '@material-ui/icons/NoteAddOutlined'
import DocumentList from '../components/documentList'
import Content from '../components/content'
import {useDraftsList, createDraft} from '../shared/drafts'
import {LibraryLayout} from '../components/library-layout'

export type ListType = 'drafts' | 'publications'

export default function Drafts() {
  const router = useRouter()
  const drafts = useDraftsList()

  async function handleCreateDraft() {
    await createDraft(async newDraft => {
      const value = newDraft.toObject()
      router.push({
        pathname: `/editor/${value.documentId}`,
      })
    })
  }

  return (
    <Content>
      <Seo title="Drafts" />
      {/* show/hide depending on the desired criteria (TBD) */}
      {drafts.status === 'success' &&
        drafts.resolvedData.toObject().draftsList.length === 0 && (
          <Fragment>
            <div className="bg-background-muted border-muted border-solid border-2 rounded px-8 pt-6 pb-8 mb-4 text-center flex flex-col items-center">
              <h2 className="text-3xl font-semibold text-info">
                Welcome to Mintter!
              </h2>
              <p className="text-body font-light mt-5">
                Some clain sentence that's fun, welcomes user to the community
                and tells how it works and encourages to get started
              </p>
              <button
                onClick={handleCreateDraft}
                className="bg-info hover:bg-info-hover text-white font-bold py-3 px-4 rounded rounded-full flex items-center mt-5 justify-center"
              >
                <NoteAddOutlinedIcon />
                <span className="ml-2">Create your first Draft</span>
              </button>
            </div>
            <hr className="border-t-2 border-muted border-solid my-8" />
          </Fragment>
        )}

      <DocumentList
        status={drafts.status}
        error={drafts.error}
        data={drafts?.resolvedData?.toObject().draftsList}
      />
    </Content>
  )
}

Drafts.Layout = LibraryLayout
