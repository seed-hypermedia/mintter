import {useDraftList, usePublicationList} from '@app/hooks'
import {useNavigationActions} from '@app/utils/navigation'
import {EmptyList} from '@components/empty-list'
import Footer from '@components/footer'
import {} from '@mintter/ui'
import {PublicationListItem} from '@components/publication-list-item'
import {YStack, MainWrapper} from '@mintter/ui'
import '../styles/file-list.scss'

export default function PublicationList() {
  let {data, isInitialLoading} = usePublicationList()
  let drafts = useDraftList()
  let nav = useNavigationActions()

  return (
    <>
      <MainWrapper>
        <YStack tag="ul">
          {isInitialLoading ? (
            <p>loading...</p>
          ) : data && data.publications.length ? (
            data.publications.map((publication) => (
              <PublicationListItem
                hasDraft={drafts.data?.documents.find(
                  (d) => d.id == publication.document?.id,
                )}
                key={`${publication.document?.id}/${publication.version}`}
                publication={publication}
              />
            ))
          ) : (
            <EmptyList
              description="You have no Publications yet."
              action={() => {
                nav.openNewDraft(false)
              }}
            />
          )}
        </YStack>
      </MainWrapper>
      <Footer />
    </>
  )
}
