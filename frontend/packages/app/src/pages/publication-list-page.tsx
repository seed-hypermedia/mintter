import {EmptyList} from '@mintter/app/src/components/empty-list'
import Footer from '@mintter/app/src/components/footer'
import {PublicationListItem} from '@mintter/app/src/components/publication-list-item'
import {
  useDraftList,
  usePublicationList,
} from '@mintter/app/src/models/documents'
import {useOpenDraft} from '@mintter/app/src/utils/open-draft'
import {Button, Container, MainWrapper, Spinner, YStack} from '@mintter/ui'
import {useState} from 'react'
import {FixedSizeList as List} from 'react-window'

import './publication-list-page.css'
import {useDeletePublication} from '../models/documents'
import {usePopoverState} from '../use-popover-state'
import {DeleteDialog} from '../components/delete-dialog'

export function PublicationListPage({trustedOnly}: {trustedOnly: boolean}) {
  let {data} = usePublicationList(trustedOnly)
  let drafts = useDraftList()
  let openDraft = useOpenDraft()
  const pubs = data?.publications
  const dialogState = usePopoverState()
  const [deleteDocId, setDeleteDocId] = useState('')
  const [scrollHeight, setScrollHeight] = useState(800)

  const deletePub = useDeletePublication({
    onSuccess: () => {
      dialogState.onOpenChange(false)
    },
  })

  const RenderPublicationRow = ({
    index,
    style,
  }: {
    index: number
    style: React.CSSProperties
  }) => {
    const publication = pubs?.[index]
    if (!publication) return null
    return (
      <div style={style}>
        <PublicationListItem
          hasDraft={drafts.data?.documents.find(
            (d) => d.id == publication.document?.id,
          )}
          publication={publication}
          pubContext={trustedOnly ? 'trusted' : null}
          handleDelete={(docId: string) => {
            setDeleteDocId(docId)
            dialogState.onOpenChange(true)
          }}
        />
      </div>
    )
  }

  let content = (
    <YStack justifyContent="center" height={scrollHeight}>
      <Spinner />
    </YStack>
  )
  if (pubs) {
    if (pubs.length) {
      // content = (
      //   <List
      //     className="publication-list-scroller"
      //     height={scrollHeight}
      //     width="100%"
      //     itemSize={44}
      //     overscanCount={100}
      //     itemCount={pubs?.length || 0}
      //   >
      //     {RenderPublicationRow}
      //   </List>
      // )
      content = (
        <>
          {pubs.map((publication) => {
            return (
              <PublicationListItem
                pubContext={trustedOnly ? 'trusted' : null}
                key={publication.document?.id}
                hasDraft={drafts.data?.documents.find(
                  (d) => d.id == publication.document?.id,
                )}
                publication={publication}
                handleDelete={(docId: string) => {
                  setDeleteDocId(docId)
                  dialogState.onOpenChange(true)
                }}
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
        <Container>
          {content}
          <DeleteDialog
            modal
            {...dialogState}
            title="Delete document"
            description="Are you sure you want to delete this document? This action is not reversible."
            cancelButton={
              <Button
                onPress={() => {
                  setDeleteDocId('')
                  dialogState.onOpenChange(false)
                }}
                chromeless
              >
                Cancel
              </Button>
            }
            actionButton={
              <Button
                theme="red"
                onPress={() => {
                  if (deleteDocId) {
                    deletePub.mutate(deleteDocId)
                    dialogState.onOpenChange(false)
                  }
                }}
              >
                Delete
              </Button>
            }
          />
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}

export default function TrustedPublicationList() {
  return <PublicationListPage trustedOnly={true} />
}
