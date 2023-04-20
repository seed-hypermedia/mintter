import {useDraftList, usePublicationList} from '@app/models/documents'
import {useOpenDraft} from '@app/utils/open-draft'
import {EmptyList} from '@components/empty-list'
import Footer from '@components/footer'
import {PublicationListItem} from '@components/publication-list-item'
import {YStack, MainWrapper, Container} from '@mintter/ui'

export default function PublicationList() {
  let {data, isInitialLoading} = usePublicationList()
  let drafts = useDraftList()
  let openDraft = useOpenDraft()

  return (
    <>
      <MainWrapper>
        <Container>
          <YStack tag="ul" padding={0}>
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
                  openDraft(false)
                }}
              />
            )}
          </YStack>
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}
