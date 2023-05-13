import {Account, blockNodeToSlate, SiteInfo} from '@mintter/shared'
import {
  ArticleContainer,
  Container,
  Header,
  MainContainer,
  SideContainer,
  Spinner,
  useMedia,
  YStack,
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
import {JsonValue} from '@bufbuild/protobuf'
import {Publication} from '@mintter/shared/client/.generated/documents/v1alpha/documents_pb'
import {trpc} from 'trpc'
import {useMemo} from 'react'

export type PublicationPageProps = {
  documentId: string
  version: string | null
  metadata?: boolean
  publication: JsonValue | null
  editors: JsonValue[] | null
  siteInfo: JsonValue | null
}

export type PublicationPageData = {
  documentId: string
  version?: string
  publication?: Publication | null
  author?: Account | null
  editors: Array<Account | string | null> | null
  siteInfo: SiteInfo | null
}

function preparePublicationData(
  props: PublicationPageProps,
): PublicationPageData {
  return {
    documentId: props.documentId,
    version: props.version || undefined,
    publication:
      props.publication == null
        ? null
        : Publication.fromJson(props.publication),
    editors: props.editors
      ? props.editors.map((editor) => {
          if (typeof editor === 'object') return Account.fromJson(editor)
          if (typeof editor === 'string') return editor
          return null
        })
      : null,
    siteInfo: props.siteInfo ? SiteInfo.fromJson(props.siteInfo) : null,
  }
}

export default function PublicationPage({
  metadata = true,
  ...props
}: PublicationPageProps) {
  const {publication, siteInfo, editors} = preparePublicationData(props)
  let media = useMedia()
  const renderElement = useRenderElement()
  const renderLeaf = useRenderLeaf()

  const loadedPublication = trpc.publication.get.useQuery({
    documentId: props.documentId,
    versionId: props.version || undefined,
  })

  const {slateChildren, displayPub} = useMemo(() => {
    const loadedPub = loadedPublication.data?.publication
      ? Publication.fromJson(loadedPublication.data.publication)
      : null
    const displayPub = loadedPub || publication
    const blockChildren = displayPub?.document?.children
    const slateChildren = blockChildren
      ? blockNodeToSlate(blockChildren, 'group')
      : undefined
    return {slateChildren, displayPub}
  }, [loadedPublication.data, publication])

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
            flexDirection={media.gtSm ? 'row' : 'column'}
            paddingRight={media.gtSm ? '$4' : 0}
          >
            <MainContainer flex={3}>
              {slateChildren ? (
                <SlateReactPresentation
                  value={[slateChildren]}
                  renderElement={renderElement}
                  renderLeaf={renderLeaf}
                />
              ) : (
                <YStack>
                  <Header>Querying for document on the network.</Header>
                  <Spinner />
                </YStack>
              )}
            </MainContainer>
            <SideContainer flex={1}>
              {metadata ? (
                <>
                  <PublicationMetadata
                    publication={displayPub}
                    editors={editors || []}
                  />
                  {(displayPub && editors?.length) ||
                  (displayPub && displayPub.document?.author) ? (
                    <WebTipping
                      publication={displayPub}
                      editors={editors || []}
                      author={null}
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
