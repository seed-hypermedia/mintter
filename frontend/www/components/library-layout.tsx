import Layout from './layout'
import Link from './link'
import LibraryHeader from './library-header'
import Container from './container'
import {ErrorBoundary} from 'react-error-boundary'
import {FullPageErrorMessage} from './errorMessage'
import {useRouter} from 'next/router'
import {createDraft} from '../shared/drafts'

export function LibraryLayout({children}) {
  const router = useRouter()

  async function handleCreateDraft() {
    await createDraft(async newDraft => {
      const value = newDraft.toObject()
      router.push({
        pathname: `/editor/${value.documentId}`,
      })
    })
  }

  return (
    <ErrorBoundary FallbackComponent={FullPageErrorMessage}>
      <Layout className="flex flex-col">
        <LibraryHeader />
        <div className="flex-1 overflow-y-auto">
          <Container>
            <div className="p-5 flex items-baseline justify-between">
              <h1 className="text-4xl font-bold text-heading">Library</h1>
              <button
                onClick={handleCreateDraft}
                className="bg-info hover:bg-info-hover text-white font-bold py-2 px-4 rounded rounded-full flex items-center justify-center"
              >
                new Draft
              </button>
            </div>
            {children}
          </Container>
        </div>
      </Layout>
    </ErrorBoundary>
  )
}
