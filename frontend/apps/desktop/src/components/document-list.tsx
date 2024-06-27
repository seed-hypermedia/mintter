import { useDocumentList } from '@/models/documents'
import { Delete, List, Spinner } from '@shm/ui'

import { useAppContext } from '@/app-context'
import { useCopyGatewayReference } from '@/components/copy-gateway-reference'
import { DocumentListItem } from '@/components/document-list-item'
import { copyLinkMenuItem } from '@/components/list-item'
import {
  queryDocument
} from '@/models/documents'
import { getDocumentTitle, unpackHmId } from '@shm/shared'
import { ReactNode } from 'react'
import { useDeleteDialog } from './delete-dialog'

export function DocumentsFullList({
  header,
}: {
  header: ReactNode
}) {
  const documents = useDocumentList({})
  const { queryClient, grpcClient } = useAppContext()
  const deleteDialog = useDeleteDialog()

  const items = documents.data.documents
  const [copyDialogContent, onCopyId] = useCopyGatewayReference()
  if (!items) return <Spinner />
  return (
    <>
      <List
        items={items}
        header={header}
        fixedItemHeight={52}
        onEndReached={() => {
          documents.fetchNextPage()
        }}
        renderItem={({ item: document }) => {
          const { authors, author } = document
          if (!document) return null
          const docId = document.id
          const id = unpackHmId(docId)
          if (!id) return null
          return (
            <DocumentListItem
              openRoute={{
                key: 'document',
                documentId: docId,
              }}
              hasDraft={drafts.data?.documents.find(
                (d) => d.id == document?.id,
              )}
              onPointerEnter={() => {
                if (document?.id) {
                  queryClient.client.prefetchQuery(
                    queryDocument({
                      grpcClient,
                      docId: document.id,
                      version: document.version,
                    }),
                  )
                }
              }}
              document={document}
              author={author}
              editors={authors}
              menuItems={() => [
                copyLinkMenuItem(() => {
                  onCopyId({
                    ...id,
                    version: document.version,
                  })
                }, 'document'),
                {
                  key: 'delete',
                  label: 'Delete Document',
                  icon: Delete,
                  onPress: () => {
                    deleteDialog.open({
                      id: docId,
                      title: getDocumentTitle(document),
                    })
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
