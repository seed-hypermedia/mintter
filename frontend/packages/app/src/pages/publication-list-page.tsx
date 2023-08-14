import {EmptyList} from '@mintter/app/src/components/empty-list'
import Footer from '@mintter/app/src/components/footer'
import {PublicationListItem} from '@mintter/app/src/components/publication-list-item'
import {
  useDraftList,
  usePublicationList,
} from '@mintter/app/src/models/documents'
import {useOpenDraft} from '@mintter/app/src/utils/open-draft'
import {Container, MainWrapper, Spinner, YStack} from '@mintter/ui'
import {useState} from 'react'

import './publication-list-page.css'

export function PublicationListPage({trustedOnly}: {trustedOnly: boolean}) {
  let {data} = usePublicationList({trustedOnly})
  let drafts = useDraftList()
  let openDraft = useOpenDraft()
  const pubs = data?.publications
  const [scrollHeight, setScrollHeight] = useState(800)

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
        <Container>{content}</Container>
      </MainWrapper>
      <Footer />
    </>
  )
}

export default function TrustedPublicationList() {
  return <PublicationListPage trustedOnly={true} />
}
