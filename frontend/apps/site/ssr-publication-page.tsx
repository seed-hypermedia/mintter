import {
  Account,
  ImageBlock,
  Block as ServerBlock,
  InlineContent,
  PresentationBlock,
  SectionBlock,
  SiteInfo,
  isMintterScheme,
  getCIDFromIPFSUrl,
  serverBlockToEditorInline,
} from '@mintter/shared'
import {
  ArticleContainer,
  Container,
  Header,
  MainContainer,
  SideContainer,
  Spinner,
  Text,
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
import {JsonValue} from '@bufbuild/protobuf'
import {
  Block,
  BlockNode,
  Publication,
} from '@mintter/shared/client/.generated/documents/v1alpha/documents_pb'
import {trpc} from 'trpc'
import {useMemo} from 'react'
import Image from 'next/image'

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

function PublicationContent({
  publication,
}: {
  publication: Publication | undefined
}) {
  return (
    <YStack>
      {publication?.document?.children?.map((block, index) => (
        <StaticBlockNode block={block} key={block.block?.id || index} />
      ))}
    </YStack>
  )
}

export default function PublicationPage({
  metadata = true,
  ...props
}: PublicationPageProps) {
  const {publication, siteInfo, editors} = preparePublicationData(props)
  let media = useMedia()
  const {documentId} = props
  const loadedPublication = trpc.publication.get.useQuery({
    documentId: props.documentId,
    versionId: props.version || undefined,
  })

  const {displayPub} = useMemo(() => {
    const loadedPub = loadedPublication.data?.publication
      ? Publication.fromJson(loadedPublication.data.publication)
      : null
    const displayPub = loadedPub || publication
    return {displayPub}
  }, [loadedPublication.data, publication])

  return (
    <HighlightProvider>
      <HoverProvider>
        <Container tag="main" id="main-content" tabIndex={-1}>
          {siteInfo ? (
            <SiteHead siteInfo={siteInfo} />
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
              {displayPub ? (
                <PublicationContent publication={displayPub} />
              ) : loadedPublication.isLoading ? (
                <YStack>
                  <Header>Querying for document on the network.</Header>
                  <Spinner />
                </YStack>
              ) : (
                <Header>Document not found.</Header>
              )}
            </MainContainer>
            <SideContainer flex={1}>
              {metadata ? (
                <>
                  <PublicationMetadata
                    publication={displayPub || undefined}
                    editors={editors || []}
                  />
                  {editors?.length && documentId ? (
                    <WebTipping docId={documentId} editors={editors || []} />
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

function InlineContentView({inline}: {inline: InlineContent[]}) {
  return (
    <>
      {inline.map((content, index) => {
        if (content.type === 'text') {
          let textDecorationLine:
            | 'underline'
            | 'none'
            | 'line-through'
            | 'underline line-through'
            | '' = ''
          if (content.styles.underline) {
            if (content.styles.strike) {
              textDecorationLine = 'underline line-through'
            } else {
              textDecorationLine = 'underline'
            }
          } else if (content.styles.strike) {
            textDecorationLine = 'line-through'
          }
          return (
            <Text
              key={index}
              fontWeight={content.styles.bold ? 'bold' : ''}
              textDecorationLine={textDecorationLine || undefined}
              fontStyle={content.styles.italic ? 'italic' : undefined}
              fontFamily={content.styles.code ? 'monospace' : undefined}
            >
              {content.text}
            </Text>
          )
        }
        if (content.type === 'link') {
          return (
            <span
              key={index}
              className={isMintterScheme(content.href) ? 'hd-link' : 'link'}
              onClick={() => {
                // @ts-expect-error
                window.location = content.href
              }}
              style={{cursor: 'pointer'}}
            >
              <InlineContentView inline={content.content} />
            </span>
          )
        }
        return null
      })}
    </>
  )
}

function StaticSectionBlock({block}: {block: SectionBlock}) {
  const inline = useMemo(
    () => serverBlockToEditorInline(new Block(block)),
    [block],
  )
  return (
    <span>
      <InlineContentView inline={inline} />
    </span>
  )
}

function StaticImageBlock({block}: {block: ImageBlock}) {
  const cid = getCIDFromIPFSUrl(block?.ref)
  if (!cid) return null
  return (
    <img
      alt={block.attributes.alt}
      src={`${process.env.NEXT_PUBLIC_GRPC_HOST}/ipfs/${cid}`}
      // layout="fill"
      className="image"
    />
  )
  // return <img src={`${process.env.NEXT_PUBLIC_GRPC_HOST}/ipfs/${cid}`} />
}

function StaticBlock({block}: {block: ServerBlock}) {
  let niceBlock = block as PresentationBlock // todo, validation

  if (niceBlock.type === 'paragraph' || niceBlock.type === 'heading') {
    return <StaticSectionBlock block={niceBlock} />
  }
  if (niceBlock.type === 'image') {
    return <StaticImageBlock block={niceBlock} />
  }
  if (niceBlock.type === 'embed') {
    return <span>nested embeds not supported yet, should be easy though.</span>
  }
  if (niceBlock.type === 'code') {
    return <span>code blocks not supported yet.</span>
  }
  // fallback for unknown block types
  // return <span>{JSON.stringify(block)}</span>
  return <span>mystery block 👻</span>
}

function StaticBlockNode({block}: {block: BlockNode}) {
  const children =
    block.children.length > 0 ? (
      <YStack paddingLeft="$5">
        {block.children.map((child, index) => (
          <StaticBlockNode key={child.block?.id || index} block={child} />
        ))}
      </YStack>
    ) : null
  return (
    <YStack>
      {block.block && <StaticBlock block={block.block} />}
      {children}
    </YStack>
  )
}
