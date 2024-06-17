import {PublicationListItem} from '@shm/app/components/publication-list-item'
import {useAccountGroups} from '@shm/app/models/groups'
import {Profile, unpackDocId, unpackHmId} from '@shm/shared'
import {List} from '@shm/ui'
import {useMemo} from 'react'
import {useCopyGatewayReference} from '../components/copy-gateway-reference'
import {useDeleteDialog} from '../components/delete-dialog'
import {copyLinkMenuItem} from '../components/list-item'
import {useAllAccounts} from '../models/accounts'
import {useAccountPublications} from '../models/documents'
import {GroupListItem} from './groups'

export function getAccountName(profile: Profile | undefined) {
  if (!profile) return ''
  return profile.alias || 'Untitled Account'
}

export function AccountPublications({accountId}: {accountId: string}) {
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
        renderItem={({item}) => {
          const {publication, author, editors} = item
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
                    variants: [{key: 'author', author: accountId}],
                  })
                }, 'Publication'),
              ]}
              openRoute={{
                key: 'publication',
                documentId: docId,
                versionId: publication.version,
                variants: [
                  {
                    key: 'author',
                    author: accountId,
                  },
                ],
              }}
            />
          )
        }}
      />
      {copyDialogContent}
    </>
  )
}

export function AccountGroups({accountId}: {accountId: string}) {
  if (!accountId) throw new Error('Invalid route, no account id')
  const {data: groups} = useAccountGroups(accountId)
  const [copyDialogContent, onCopyId] = useCopyGatewayReference()
  const deleteDialog = useDeleteDialog()
  return (
    <>
      {groups?.items ? (
        <List
          items={groups.items}
          renderItem={({item}) => (
            <GroupListItem
              group={item.group}
              onCopy={() => {
                const groupId = unpackHmId(item?.group?.id)
                if (!groupId) return
                onCopyId(groupId)
              }}
              onDelete={deleteDialog.open}
            />
          )}
        />
      ) : null}
      {copyDialogContent}
      {deleteDialog.content}
    </>
  )
}
