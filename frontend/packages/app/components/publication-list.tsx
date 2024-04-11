import {useDraftList} from '@mintter/app/models/documents'
import {Delete, List, Spinner} from '@mintter/ui'

import {Document, PublicationVariant, unpackHmId} from '@mintter/shared'
import {Trash} from '@tamagui/lucide-icons'
import React, {ReactNode} from 'react'
import {useAppContext} from '../app-context'
import {useCopyGatewayReference} from '../components/copy-gateway-reference'
import {DeleteDocumentDialog} from '../components/delete-dialog'
import {useDeleteDraftDialog} from '../components/delete-draft-dialog'
import {useAppDialog} from '../components/dialog'
import {ListItem, copyLinkMenuItem} from '../components/list-item'
import {PublicationListItem} from '../components/publication-list-item'
import {
  queryDraft,
  queryPublication,
  usePublicationFullList,
} from '../models/documents'
import {DraftRoute} from '../utils/routes'
import {useClickNavigate} from '../utils/useNavigate'

export function PublicationsList({
  header,
  trustedOnly,
}: {
  header: ReactNode
  trustedOnly: boolean
}) {
  const publications = usePublicationFullList({trustedOnly})
  const drafts = useDraftList()
  const {queryClient, grpcClient} = useAppContext()
  const deleteDialog = useAppDialog(DeleteDocumentDialog, {isAlert: true})

  const items = publications.data
  const [copyDialogContent, onCopyId] = useCopyGatewayReference()
  if (!items) return <Spinner />
  return (
    <>
      <List
        key={trustedOnly ? 'trusted' : 'all'}
        items={items}
        header={header}
        fixedItemHeight={52}
        onEndReached={() => {
          publications.fetchNextPage()
        }}
        renderItem={({item}) => {
          const {publication, author, editors} = item
          if (!publication.document) return null
          const docId = publication.document.id
          const id = unpackHmId(docId)
          if (!id) return null
          const variants: PublicationVariant[] = [
            {
              key: 'author',
              author: publication.document.author,
            },
          ]
          return (
            <PublicationListItem
              variants={variants}
              openRoute={{
                key: 'publication',
                documentId: docId,
                variants,
              }}
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
              author={author}
              editors={editors}
              menuItems={() => [
                copyLinkMenuItem(() => {
                  onCopyId({
                    ...id,
                    variants,
                    version: publication.version,
                  })
                }, 'Publication'),
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
        }}
      />
      {copyDialogContent}
      {deleteDialog.content}
    </>
  )
}

const DraftListItem = React.memo(function DraftListItem({
  draft,
}: {
  draft: Document
}) {
  let title = draft.title || 'Untitled Document'
  const deleteDialog = useDeleteDraftDialog()
  const navigate = useClickNavigate()
  const {queryClient, grpcClient} = useAppContext()
  if (!draft.id) throw new Error('DraftListItem requires an id')
  const draftRoute: DraftRoute = {
    key: 'draft',
    draftId: draft.id,
    variant: null,
  }
  const goToItem = (e: any) => {
    navigate(draftRoute as DraftRoute, e)
  }
  return (
    <>
      <ListItem
        title={title}
        onPointerEnter={() => {
          queryClient.client.prefetchQuery(
            queryDraft({grpcClient, documentId: draft.id}),
          )
        }}
        onPress={goToItem}
        menuItems={[
          {
            label: 'Delete Draft',
            key: 'delete',
            icon: Trash,
            onPress: () => {
              deleteDialog.open({draftId: draft.id})
            },
          },
        ]}
      />
      {deleteDialog.content}
    </>
  )
})
