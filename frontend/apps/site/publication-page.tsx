import {
  Account,
  ImageBlock,
  EmbedBlock,
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
  Button,
  Container,
  ContainerLarge,
  Copy,
  Header,
  Main,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import Head from 'next/head'
import {WebTipping} from 'web-tipping'
import {PublicationMetadata} from './publication-metadata'
import Footer from './footer'
import {SiteHead} from './site-head'
import {
  Block,
  Publication,
} from '@mintter/shared/client/.generated/documents/v1alpha/documents_pb'
import {trpc} from 'trpc'
import {useMemo, useState} from 'react'
import {DehydratedState} from '@tanstack/react-query'
import {HDBlock, HDBlockNode, HDPublication} from 'server/json-hd'
import {cidURL} from 'ipfs'
import {useRouter} from 'next/router'

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
        <StaticBlockNode
          block={block}
          key={block.block?.id || index}
          ctx={{
            enableBlockCopy: true,
            ref: `/d/${publication?.document?.id}?v=${publication.version}`,
          }}
        />
      ))}
    </YStack>
  )
}

export default function PublicationPage({
  documentId,
  version,
}: {
  documentId: string
  version?: string | null
}) {
  const publication = trpc.publication.get.useQuery({
    documentId: documentId,
    versionId: version || '',
  })

  const pub = publication.data?.publication

  return (
    <>
      <Head>
        <meta
          name="hyperdocs-entity-id"
          content={`hd://d/${pub?.document?.id}`}
        />
        <meta name="hyperdocs-entity-version" content={pub?.version} />
        <meta name="hyperdocs-entity-title" content={pub?.document?.title} />
        {/* legacy mintter metadata */}
        <meta name="mintter-document-id" content={pub?.document?.id} />
        <meta name="mintter-document-version" content={pub?.version} />
        <meta name="mintter-document-title" content={pub?.document?.title} />
      </Head>
      <SiteHead title={pub?.document?.title} titleHref={`/d/${documentId}`} />
      <YStack height="100%" flex={1} justifyContent="space-between">
        <YStack $gtXl={{flexDirection: 'row', paddingTop: '$4'}} gap="$2">
          <YStack
            marginHorizontal={'auto'}
            paddingHorizontal="$4"
            width="100%"
            maxWidth={760}
            $gtXl={{
              borderTopWidth: 0,
              width: 300,
              overflow: 'scroll',
            }}
          ></YStack>
          <ContainerLarge tag="main" id="main-content" tabIndex={-1}>
            <Main>
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
            </Main>
          </ContainerLarge>
          <YStack
            marginHorizontal={'auto'}
            paddingHorizontal="$4"
            width="100%"
            maxWidth={760}
            borderColor="$gray6"
            gap="$2"
            borderTopWidth={1}
            paddingTop="$6"
            paddingBottom="$6"
            $gtXl={{
              paddingTop: 0,
              borderTopWidth: 0,
              width: 300,
              overflow: 'scroll',
            }}
          >
            <PublicationMetadata publication={pub} />
            <WebTipping
              docId={documentId}
              editors={pub?.document?.editors || []}
            />
          </YStack>
        </YStack>
        <ContainerLarge>
          <Footer />
        </ContainerLarge>
      </YStack>
    </>
  )
}

function InlineContentView({
  inline,
  style,
}: {
  inline: InlineContent[]
  style?: {heading: boolean}
}) {
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
          const isHeading = style?.heading || false
          const isBold = content.styles.bold || false
          return (
            <Text
              key={index}
              fontSize={isHeading ? 24 : undefined}
              fontWeight={isHeading || isBold ? 'bold' : ''}
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
  const isBlockquote = block.attributes?.type === 'blockquote'
  return (
    <YStack
      id={`${block.id}-block`}
      paddingLeft={isBlockquote ? 20 : 0}
      borderLeftWidth={isBlockquote ? 1 : 0}
      borderLeftColor={'blue'}
    >
      <Text>
        <InlineContentView
          inline={inline}
          style={{
            heading: block.type === 'heading',
          }}
        />
      </Text>
    </YStack>
  )
}

function StaticImageBlock({block}: {block: ImageBlock}) {
  const cid = getCIDFromIPFSUrl(block?.ref)
  if (!cid) return null
  return (
    <XStack minHeight={60} margin={10}>
      <img
        id={`${block.id}-block`}
        alt={block.attributes?.alt}
        src={cidURL(cid)}
        className="image"
        onError={(e) => {
          console.error('image errored', e)
        }}
      />
    </XStack>
  )
  // return <img src={`${process.env.NEXT_PUBLIC_GRPC_HOST}/ipfs/${cid}`} />
}

function stripHDLinkPrefix(link: string) {
  return link.replace(/^hd:\//, '')
}

function StaticEmbedBlock({block}: {block: EmbedBlock}) {
  const reference = block.ref
  const [documentId, versionId, blockId] = getIdsfromUrl(reference)
  const router = useRouter()
  let embed = trpc.publication.get.useQuery(
    {
      documentId,
      versionId,
    },
    {enabled: !!documentId},
  )
  let content = <Spinner />
  if (embed.data?.publication?.document?.children) {
    content = (
      <>
        {embed.data?.publication?.document?.children?.map((block) => (
          <StaticBlockNode block={block} key={block?.block?.id} ctx={{}} />
        ))}
      </>
    )
  }
  return (
    <div id={`${block.id}-block`} data-ref={reference}>
      <YStack
        backgroundColor="#d8ede7"
        borderColor="#95bfb4"
        borderWidth={1}
        padding="$4"
        paddingVertical="$2"
        borderRadius="$4"
        hoverStyle={{
          backgroundColor: '#e8f4f0',
          cursor: 'pointer',
        }}
        onPress={() => {
          const ref = stripHDLinkPrefix(block.ref)
          router.push(ref)
        }}
        href={stripHDLinkPrefix(block.ref)}
      >
        {content}
      </YStack>
    </div>
  )
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
    return <StaticEmbedBlock block={niceBlock} />
  }
  if (niceBlock.type === 'code') {
    return <span>code blocks not supported yet.</span>
  }
  // fallback for unknown block types
  // return <span>{JSON.stringify(block)}</span>
  return (
    <ErrorMessageBlock
      id={`${niceBlock.id}-block`}
      message={`Unknown block type: "${niceBlock.type}"`}
    />
  )
}

function ErrorMessageBlock({message, id}: {message: string; id: string}) {
  return (
    <YStack
      backgroundColor="#d8ede7"
      borderColor="#95bfb4"
      borderWidth={1}
      padding="$4"
      paddingVertical="$2"
      borderRadius="$4"
      id={id}
    >
      <Text>{message}</Text>
    </YStack>
  )
}

type PublicationViewContext = {
  headingDepth?: number
  enableBlockCopy?: boolean
  ref?: string
}

function StaticBlockNode({
  block,
  ctx,
}: {
  block: HDBlockNode
  ctx?: PublicationViewContext
}) {
  const [isHovering, setIsHovering] = useState(false)
  const children =
    (block.children?.length || 0) > 0 ? (
      <YStack paddingLeft="$5">
        {block.children?.map((child, index) => (
          <StaticBlockNode
            key={child.block?.id || index}
            block={child}
            ctx={ctx}
          />
        ))}
      </YStack>
    ) : null
  const id = block.block?.id || 'unknown-block'
  return (
    <YStack
      paddingVertical="$2"
      id={id}
      onHoverIn={() => setIsHovering(true)}
      onHoverOut={() => setIsHovering(false)}
      position="relative"
    >
      {block.block && <StaticBlock block={block.block} />}
      {children}
      {ctx?.enableBlockCopy && (
        <XStack
          padding="$2"
          gap="$1"
          backgroundColor={'$background'}
          position="absolute"
          borderRadius="$2"
          top={0}
          right={0}
          display={isHovering ? 'flex' : 'none'}
        >
          <Button
            tag="a"
            size="$2"
            chromeless
            href={`#${id}`}
            icon={Copy}
            onPress={() => {
              navigator.clipboard.writeText(
                `${window.location.protocol}//${window.location.host}${ctx.ref}#${id}`,
              )
            }}
          ></Button>
        </XStack>
      )}
    </YStack>
  )
}
