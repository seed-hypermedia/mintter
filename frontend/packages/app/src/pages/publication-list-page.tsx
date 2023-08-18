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

export function PublicationListPage({trustedOnly}: {trustedOnly: boolean}) {
  let {data} = usePublicationList({trustedOnly})
  let drafts = useDraftList()
  let openDraft = useOpenDraft()
  const pubs = data?.publications
  const [scrollHeight, setScrollHeight] = useState(800)

  let content = (
    <YStack justifyContent="center" height={scrollHeight}>
      <Spinner />
    </YStack>
  )
  const deleteDialog = useAppDialog(DeleteDocumentDialog, {isAlert: true})
  if (pubs) {
    if (pubs.length) {
      content = (
        <>
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
        </>
      )
    } else {
      content = (
        <EmptyList
          description="You have no Publications yet."
          action={() => {
            openDraft(false)
          }}
        />
      )
    }
  }
  return (
    <>
      <MainWrapper
        onLayout={(e) => {
          // console.log('layout height!', e.nativeEvent.layout.height)
          // setScrollHeight(() => e.nativeEvent.layout.height)
        }}
      >
        <Container>{content}</Container>
        {deleteDialog.content}
      </MainWrapper>
      <Footer />
    </>
  )
}

export default function TrustedPublicationList() {
  return <PublicationListPage trustedOnly={true} />
}
