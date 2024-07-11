import {useCopyGatewayReference} from '@/components/copy-gateway-reference'
import {DocumentListItem} from '@/components/document-list-item'
import Footer from '@/components/footer'
import {copyLinkMenuItem} from '@/components/list-item'
import {MainWrapperNoScroll} from '@/components/main-wrapper'
import {useAllAccounts} from '@/models/accounts'
import {useEntity} from '@/models/entities'
import {FavoriteItem, useFavorites} from '@/models/favorites'
import {HMAccount, UnpackedHypermediaId} from '@shm/shared'
import {List} from '@shm/ui'
import {ContactItem} from './contacts-page'

export default function FavoritesPage() {
  const favorites = useFavorites()
  const allAccounts = useAllAccounts()
  const [copyContent, onCopy, host] = useCopyGatewayReference()

  return (
    <>
      <MainWrapperNoScroll>
        <List
          items={favorites}
          //   header={header}
          fixedItemHeight={52}
          onEndReached={() => {
            // publications.fetchNextPage()
          }}
          renderItem={({item}) => {
            return (
              <FavoriteListItem
                key={item.url}
                item={item}
                onCopy={() => {
                  onCopy(item.id)
                }}
                allAccounts={allAccounts.data?.accounts}
              />
            )
          }}
        />
        {copyContent}
      </MainWrapperNoScroll>
      <Footer />
    </>
  )
}

function DocumentFavoriteItem({
  url,
  id,
  onCopy,
  allAccounts,
}: {
  url: string
  id: UnpackedHypermediaId
  onCopy: () => void
  allAccounts?: HMAccount[]
}) {
  if (id.type !== 'd') throw new Error('Not a document')
  const doc = useEntity(id)
  if (!doc.data?.document) return null
  function findAccount(id?: string) {
    return allAccounts?.find((a) => a.id === id)
  }
  return (
    <DocumentListItem
      key={id.qid}
      document={doc.data?.document}
      hasDraft={undefined}
      author={findAccount(doc.data?.document?.owner)}
      editors={
        doc.data?.document?.authors?.map((accountId) =>
          findAccount(accountId),
        ) || []
      }
      menuItems={() => [copyLinkMenuItem(onCopy, 'Document')]}
      openRoute={{
        key: 'document',
        documentId: id.qid,
        versionId: id.version || undefined,
      }}
    />
  )
}

function FavoriteListItem({
  item,
  onCopy,
  allAccounts,
}: {
  item: FavoriteItem
  onCopy: () => void
  allAccounts?: HMAccount[]
}) {
  if (item.key === 'account') {
    return <ContactItem account={item.account} onCopy={onCopy} />
  }
  if (item.key === 'document') {
    return (
      <DocumentFavoriteItem
        url={item.url}
        id={item.id}
        allAccounts={allAccounts}
        onCopy={onCopy}
      />
    )
  }
  return null
}
