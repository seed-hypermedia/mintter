import { useCopyGatewayReference } from '@/components/copy-gateway-reference'
import { DocumentListItem } from '@/components/document-list-item'
import { copyLinkMenuItem } from '@/components/list-item'
import { useAllAccounts } from '@/models/accounts'
import { useAccountDocuments } from '@/models/documents'
import { unpackDocId } from '@shm/shared'
import { List } from '@shm/ui'
import { useMemo } from 'react'

export function AccountPublications({ accountId }: { accountId: string }) {
  const list = useAccountDocuments(accountId)
  const accounts = useAllAccounts()
  const data = useMemo(() => {
    function lookupAccount(accountId: string | undefined) {
      return (
        (accountId &&
          accounts.data?.accounts.find((acc) => acc.id === accountId)) ||
        accountId
      )
    }
    return list.data?.documents
      .sort((a, b) => {
        const aTime = a?.publishTime
          ? new Date(a?.publishTime).getTime()
          : undefined
        const bTime = b?.publishTime
          ? new Date(b?.publishTime).getTime()
          : undefined
        if (!aTime || !bTime) return 0
        return bTime - aTime
      })
      .map((doc) => {
        return {
          doc,
          author: lookupAccount(doc?.author),
          editors: doc?.authors?.map(lookupAccount) || [],
        }
      })
  }, [list.data, accounts.data])
  const [copyDialogContent, onCopy] = useCopyGatewayReference()
  return (
    <>
      <List
        header={null}
        items={data || []}
        renderItem={({ item }) => {
          const { doc, author, editors } = item
          const docId = doc?.id
          if (!docId) return null
          return (
            <DocumentListItem
              key={docId}
              document={doc}
              hasDraft={undefined}
              author={author}
              editors={editors}
              menuItems={() => [
                copyLinkMenuItem(() => {
                  const id = unpackDocId(docId)
                  if (!id) return
                  onCopy({
                    ...id,
                    version: doc.version || null,
                  })
                }, 'Document'),
              ]}
              openRoute={{
                key: 'document',
                documentId: docId,
                versionId: doc.version,
              }}
            />
          )
        }}
      />
      {copyDialogContent}
    </>
  )
}
