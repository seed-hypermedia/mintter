import {Account, blockNodeToSlate, Publication, SiteInfo} from '@mintter/shared'
import {
  ArticleContainer,
  Container,
  MainContainer,
  SideContainer,
  useMedia,
} from '@mintter/ui'
import Head from 'next/head'
import {HighlightProvider} from 'slate-react-presentation/highlight'
import {HoverProvider} from 'slate-react-presentation/hover'
import {WebTipping} from 'web-tipping'
import {PublicationMetadata} from './author'
import Footer from './footer'
import {GatewayHead} from './gateway-head'
import {SiteHead} from './site-head'
import {SlateReactPresentation} from './slate-react-presentation'
import {useRenderElement} from './slate-react-presentation/render-element'
import {useRenderLeaf} from './slate-react-presentation/render-leaf'

export default function PublicationPage({
  publication,
  metadata = true,
  author,
  siteInfo = null,
  editors = [],
}: {
  publication?: Publication
  author?: Account | null
  editors?: Array<Account> | null
  metadata?: boolean
  siteInfo: SiteInfo | null
}) {
  let media = useMedia()
  const renderElement = useRenderElement()
  const renderLeaf = useRenderLeaf()
  const blockChildren = publication?.document?.children
  const slateChildren = blockChildren
    ? blockNodeToSlate(blockChildren, 'group')
    : undefined

  return (
    <HighlightProvider>
      <HoverProvider>
        <Container tag="main" id="main-content" tabIndex={-1}>
          {siteInfo ? (
            <SiteHead
              siteInfo={siteInfo}
              title={publication?.document?.title}
            />
          ) : (
            <GatewayHead title={publication?.document?.title} />
          )}
          <Head>
            <meta
              name="mintter-document-id"
              content={publication?.document?.id}
            />
            <meta
              name="mintter-document-version"
              content={publication?.version}
            />
            <meta
              name="mintter-document-title"
              content={publication?.document?.title}
            />
          </Head>
          <ArticleContainer
            flexDirection={media.gtSm ? 'row' : 'column-reverse'}
          >
            <MainContainer>
              {slateChildren ? (
                <SlateReactPresentation
                  value={[slateChildren]}
                  renderElement={renderElement}
                  renderLeaf={renderLeaf}
                />
              ) : (
                <p>Empty document.</p>
              )}
            </MainContainer>
            <SideContainer>
              {metadata ? (
                <>
                  <PublicationMetadata
                    publication={publication}
                    author={author}
                  />
                  {(publication && editors?.length) ||
                  (publication && publication.document?.author) ? (
                    <WebTipping
                      publication={publication}
                      editors={editors}
                      author={author || null}
                    />
                  ) : null}
                </>
              ) : null}
            </SideContainer>
          </ArticleContainer>
          {siteInfo ? null : <Footer />}
        </Container>
      </HoverProvider>
    </HighlightProvider>
  )
}
