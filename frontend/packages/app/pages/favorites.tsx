import {HMAccount, UnpackedHypermediaId} from '@mintter/shared'
import {List} from '@mintter/ui'
import Footer from '../components/footer'
import {copyLinkMenuItem} from '../components/list-item'
import {MainWrapperNoScroll} from '../components/main-wrapper'
import {PublicationListItem} from '../components/publication-list-item'
import {useAllAccounts} from '../models/accounts'
import {FavoriteItem, useFavorites} from '../models/favorites'
import {usePublicationVariant} from '../models/publication'
import {ContactItem} from './contacts-page'
import {GroupListItem} from './groups'

export default function FavoritesPage() {
  const favorites = useFavorites()
  const allAccounts = useAllAccounts()
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
                onCopy={() => {}}
                allAccounts={allAccounts.data?.accounts}
              />
            )
          }}
        />
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
  console.log('docFavoriteItem', id.qid)
  const doc = usePublicationVariant({
    documentId: id.qid,
    versionId: id.version || undefined,
    variants: id.variants || undefined,
  })
  if (!doc.data?.publication) return null
  function findAccount(id?: string) {
    return allAccounts?.find((a) => a.id === id)
  }
  return (
    <PublicationListItem
      key={id.qid}
      publication={doc.data?.publication}
      hasDraft={undefined}
      author={findAccount(doc.data.publication?.document?.author)}
      editors={
        doc.data.publication?.document?.editors?.map((accountId) =>
          findAccount(accountId),
        ) || []
      }
      menuItems={() => [copyLinkMenuItem(onCopy, 'Publication')]}
      openRoute={{
        key: 'publication',
        documentId: id.qid,
        versionId: id.version || undefined,
        variants: id.variants || undefined,
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
  if (item.key === 'group') {
    return <GroupListItem group={item.group} onCopy={() => {}} />
  }
  if (item.key === 'account') {
    return <ContactItem account={item.account} onCopy={() => {}} />
  }
  if (item.key === 'document') {
    return (
      <DocumentFavoriteItem
        url={item.url}
        id={item.id}
        allAccounts={allAccounts}
        onCopy={() => {}}
      />
    )
  }
  return null
}
