import {
  Account,
  ImageBlock,
  InlineContent,
  PresentationBlock,
  SectionBlock,
  SiteInfo,
  getCIDFromIPFSUrl,
  serverBlockToEditorInline,
  getIdsfromUrl,
  isHyperdocsScheme,
} from '@mintter/shared'
import {
  ArticleContainer,
  Container,
  Header,
  MainContainer,
  SideContainer,
  Spinner,
  Text,
  YStack,
} from '@mintter/ui'
import Head from 'next/head'
import {WebTipping} from 'web-tipping'
import {PublicationMetadata} from './author'
import Footer from './footer'
import {GatewayHead} from './gateway-head'
import {SiteHead} from './site-head'
import {
  Block,
  Publication,
} from '@mintter/shared/client/.generated/documents/v1alpha/documents_pb'
import {trpc} from 'trpc'
import {useMemo} from 'react'
import {DehydratedState} from '@tanstack/react-query'
import {HDBlock, HDBlockNode, HDPublication} from 'server/json-hd'

function hdLinkToSitePath(link: string) {
  const [docId, version, block] = getIdsfromUrl(link)
  if (!docId) return link
  let path = `/d/${docId}`
  if (version) path += `?v=${version}`
  if (block) path += `#${block}`
  return path
}

export type PublicationPageProps = {
  // documentId: string
  // version: string | null
  // metadata?: boolean
  trpcState: DehydratedState
}

export type PublicationPageData = {
  documentId: string
  version?: string
  publication?: Publication | null
  author?: Account | null
  editors: Array<Account | string | null> | null
  siteInfo: SiteInfo | null
}

function PublicationContent({
  publication,
}: {
  publication: HDPublication | undefined
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
  documentId,
  version,
}: {
  documentId: string
  version?: string | null
  metadata?: boolean
}) {
  // let media = useMedia()
  const siteInfo = trpc.siteInfo.get.useQuery()
  const publication = trpc.publication.get.useQuery({
    documentId: documentId,
    versionId: version || undefined,
  })

  const pub = publication.data?.publication

  return (
    <Container tag="main" id="main-content" tabIndex={-1}>
      {siteInfo.data ? (
        <SiteHead siteInfo={siteInfo.data} />
      ) : (
        <GatewayHead title={pub?.document?.title} />
      )}
      <Head>
        <meta name="mintter-document-id" content={pub?.document?.id} />
        <meta name="mintter-document-version" content={pub?.version} />
        <meta name="mintter-document-title" content={pub?.document?.title} />
      </Head>
      <ArticleContainer flexWrap="wrap">
        <MainContainer flex={3} className="web-publication">
          {pub ? (
            <PublicationContent publication={pub} />
          ) : publication.isLoading ? (
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
                publication={pub || undefined}
                editors={pub?.document?.editors || []}
              />
              {pub?.document?.editors?.length && documentId ? (
                <WebTipping
                  docId={documentId}
                  editors={pub?.document?.editors || []}
                />
              ) : null}
            </>
          ) : null}
        </SideContainer>
      </ArticleContainer>
      {siteInfo ? null : <Footer />}
    </Container>
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
          const href = isHyperdocsScheme(content.href)
            ? hdLinkToSitePath(content.href)
            : content.href
          return (
            <a
              href={href}
              key={index}
              className={isHyperdocsScheme(content.href) ? 'hd-link' : 'link'}
              style={{cursor: 'pointer'}}
            >
              <InlineContentView inline={content.content} />
            </a>
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
      src={`/ipfs/${cid}`}
      // layout="fill"
      className="image"
    />
  )
  // return <img src={`${process.env.NEXT_PUBLIC_GRPC_HOST}/ipfs/${cid}`} />
}

function StaticBlock({block}: {block: HDBlock}) {
  let niceBlock = block as PresentationBlock // todo, validation

  if (niceBlock.type === 'paragraph' || niceBlock.type === 'heading') {
    return <StaticSectionBlock block={niceBlock} />
  }
  // legacy node
  // @ts-expect-error
  if (niceBlock.type === 'statement') {
    return (
      <StaticSectionBlock
        block={{
          type: 'paragraph',
          // @ts-expect-error
          ...niceBlock,
        }}
      />
    )
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

function StaticBlockNode({block}: {block: HDBlockNode}) {
  const children =
    (block.children?.length || 0) > 0 ? (
      <YStack paddingLeft="$5">
        {block.children?.map((child, index) => (
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
