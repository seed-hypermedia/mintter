import {EmptyList} from '@mintter/app/src/components/empty-list'
import Footer from '@mintter/app/src/components/footer'
import {PublicationListItem} from '@mintter/app/src/components/publication-list-item'
import {
  useDraftList,
  usePublicationList,
} from '@mintter/app/src/models/documents'
import {useOpenDraft} from '@mintter/app/src/utils/open-draft'
import {Container, Delete, MainWrapper, Spinner, YStack} from '@mintter/ui'
import {useState} from 'react'

import './publication-list-page.css'
import {DeleteDocumentDialog} from '../components/delete-dialog'
import {useAppDialog} from '../components/dialog'
import {queryPublication} from '../models/documents'
import {useAppContext} from '../app-context'
import {queryKeys} from '../models/query-keys'

export function PublicationListPage({trustedOnly}: {trustedOnly: boolean}) {
  let publications = usePublicationList({trustedOnly})
  let drafts = useDraftList()
  let {queryClient, grpcClient} = useAppContext()
  let openDraft = useOpenDraft()
  const pubs = publications.data?.publications
  const deleteDialog = useAppDialog(DeleteDocumentDialog, {isAlert: true})

  if (pubs) {
    if (pubs.length) {
      return (
        <>
          <MainWrapper>
            <Container>
              <YStack>
                {pubs.map((publication) => {
                  const docId = publication.document?.id
                  if (!docId) return null
                  return (
                    <PublicationListItem
                      pubContext={trustedOnly ? {key: 'trusted'} : null}
                      key={publication.document?.id}
                      hasDraft={drafts.data?.documents.find(
                        (d) => d.id == publication.document?.id,
                      )}
                      onPointerEnter={() => {
                        if (publication.document?.id) {
                          queryClient.client.prefetchQuery(
                            queryPublication(
                              grpcClient,
                              publication.document.id,
                              publication.version,
                            ),
                          )
                        }
                      }}
                      publication={publication}
                      menuItems={[
                        {
                          key: 'delete',
                          label: 'Delete Publication',
                          icon: Delete,
                          onPress: () => {
                            deleteDialog.open(docId)
                          },
                        },
                      ]}
                    />
                  )
                })}
              </YStack>
            </Container>
            {deleteDialog.content}
          </MainWrapper>
          <Footer />
        </>
      )
    } else {
      return (
        <>
          <MainWrapper>
            <Container>
              <EmptyList
                description="You have no Publications yet."
                action={() => {
                  openDraft(false)
                }}
              />
            </Container>
          </MainWrapper>
          <Footer />
        </>
      )
    }
  }

  return (
    <>
      <MainWrapper>
        <Container>
          <Spinner />
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}

export default function TrustedPublicationList() {
  return <PublicationListPage trustedOnly={true} />
}
