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
import {FixedSizeList as List} from 'react-window'

import './publication-list-page.css'

export default function PublicationList() {
  let {data} = usePublicationList()
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
      content = (
        <List
          className="publication-list-scroller"
          height={scrollHeight}
          width="100%"
          itemSize={44}
          overscanCount={40}
          itemCount={pubs?.length || 0}
        >
          {RenderPublicationRow}
        </List>
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
          setScrollHeight(e.nativeEvent.layout.height)
        }}
      >
        <Container>{content}</Container>
      </MainWrapper>
      <Footer />
    </>
  )
}
