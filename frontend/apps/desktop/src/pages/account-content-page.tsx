import { useCopyGatewayReference } from '@shm/desktop/src/components/copy-gateway-reference'
import { copyLinkMenuItem } from '@shm/desktop/src/components/list-item'
import { PublicationListItem } from '@shm/desktop/src/components/publication-list-item'
import { useAllAccounts } from '@shm/desktop/src/models/accounts'
import { useAccountPublications } from '@shm/desktop/src/models/documents'
import { Profile, unpackDocId } from '@shm/shared'
import { List } from '@shm/ui'
import { useMemo } from 'react'

export function getAccountName(profile: Profile | undefined) {
  if (!profile) return ''
  return profile.alias || 'Untitled Account'
}

export function AccountPublications({ accountId }: { accountId: string }) {
  const list = useAccountPublications(accountId)
  const accounts = useAllAccounts()
  const data = useMemo(() => {
    function lookupAccount(accountId: string | undefined) {
      return (
        (accountId &&
          accounts.data?.accounts.find((acc) => acc.id === accountId)) ||
        accountId
      )
    }
    return list.data?.publications
      .sort((a, b) => {
        const aTime = a?.document?.publishTime
          ? new Date(a?.document?.publishTime).getTime()
          : undefined
        const bTime = b?.document?.publishTime
          ? new Date(b?.document?.publishTime).getTime()
          : undefined
        if (!aTime || !bTime) return 0
        return bTime - aTime
      })
      .map((pub) => {
        return {
          publication: pub,
          author: lookupAccount(pub?.document?.author),
          editors: pub?.document?.editors?.map(lookupAccount) || [],
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
          const { publication, author, editors } = item
          const docId = publication.document?.id
          if (!docId) return null
          return (
            <PublicationListItem
              key={docId}
              publication={publication}
              hasDraft={undefined}
              author={author}
              editors={editors}
              menuItems={() => [
                copyLinkMenuItem(() => {
                  const id = unpackDocId(docId)
                  if (!id) return
                  onCopy({
                    ...id,
                    version: publication.version || null,
                  })
                }, 'Document'),
              ]}
              openRoute={{
                key: 'document',
                documentId: docId,
                versionId: publication.version,
              }}
            />
          )
        }}
      />
      {copyDialogContent}
    </>
  )
}

