import {
  Account,
  EmbedBlock,
  getCIDFromIPFSUrl,
  getIdsfromUrl,
  extractEntityId,
  HeadingBlock,
  ImageBlock,
  InlineContent,
  ParagraphBlock,
  PresentationBlock,
  serverBlockToEditorInline,
  SiteInfo,
  Block,
  Publication,
  entityIdToSitePath,
  HYPERMEDIA_DOCUMENT_PREFIX,
  matchesHypermediaPattern,
} from '@mintter/shared'
import {
  Button,
  Check,
  Copy,
  Footer,
  Heading,
  PageSection,
  SizableText,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import {DehydratedState} from '@tanstack/react-query'
import {cidURL} from 'ipfs'
import Head from 'next/head'
import {useRouter} from 'next/router'
import {useMemo, useState} from 'react'
import {HMBlock, HMBlockNode, HMGroup, HMPublication} from '@mintter/ui'
import {WebTipping} from 'web-tipping'
import {PublicationMetadata} from './publication-metadata'
import {SiteHead} from './site-head'
import {trpc} from './trpc'
import Link from 'next/link'

function hmLinkToSitePath(link: string) {
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
  publication: HMPublication | undefined
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

function getBlockNodeById(
  blocks: Array<HMBlockNode>,
  blockId: string,
): HMBlockNode | null {
  if (!blockId) return null

  let res: HMBlockNode | undefined
  blocks.find((bn) => {
    if (bn.block?.id == blockId) {
      res = bn
      return true
    } else if (bn.children?.length) {
      const foundChild = getBlockNodeById(bn.children, blockId)
      if (foundChild) {
        res = foundChild
        return true
      }
    }
    return false
  })
  return res || null
}

function GroupSidebarContent({
  group,
  activePathName,
  content,
}: {
  activePathName: string
  group?: HMGroup
  content?: Array<null | {
    publication: null | HMPublication
    pathName: string
    version: string
    docId: string
  }>
}) {
  const groupLink = entityIdToSitePath(group?.id)
  return (
    <>
      {groupLink && (
        <Text
          tag="a"
          href={groupLink}
          fontSize={16}
          fontWeight={'bold'}
          marginBottom="$4"
          color={'$color10'}
          textDecorationLine="none"
          justifyContent="flex-start"
          hoverStyle={{
            textDecorationLine: 'underline',
          }}
        >
          {group?.title}
        </Text>
      )}
      {content?.map((item) => {
        if (!item) return null
        return (
          <Button
            key={item.pathName}
            tag="a"
            href={`${groupLink}/${item.pathName}`}
            size="$2"
            chromeless
            justifyContent="flex-start"
            theme={activePathName === item.pathName ? 'green' : undefined}
          >
            {item?.publication?.document?.title}
          </Button>
        )
      })}
    </>
  )
}

function PublicationContextSidebar({
  group,
  activePathName,
}: {
  group?: HMGroup | null
  activePathName: string
}) {
  const groupContent = trpc.group.listContent.useQuery(
    {
      groupEid: extractEntityId(group?.id || '')?.[1] || '',
    },
    {enabled: !!group?.id},
  )
  const groupSidebarContent = group ? (
    <GroupSidebarContent
      activePathName={activePathName}
      group={group}
      content={groupContent.data}
    />
  ) : null
  return <PageSection.Side>{groupSidebarContent}</PageSection.Side>
}

export default function PublicationPage({
  pathName,
  documentId,
  version,
  contextGroup,
}: {
  pathName?: string
  documentId: string
  version?: string | null
  contextGroup?: HMGroup | null
}) {
  const publication = trpc.publication.get.useQuery({
    documentId: documentId,
    versionId: version || '',
  })

  const pub = publication.data?.publication

  return (
    <YStack flex={1}>
      <Head>
        <meta
          name="hyperdocs-entity-id"
          content={`${HYPERMEDIA_DOCUMENT_PREFIX}${pub?.document?.id}`}
        />
        <meta name="hyperdocs-entity-version" content={pub?.version} />
        <meta name="hyperdocs-entity-title" content={pub?.document?.title} />
        {/* legacy mintter metadata */}
        <meta name="hyperdocs-document-id" content={pub?.document?.id} />
        <meta name="hyperdocs-document-version" content={pub?.version} />
        <meta name="hyperdocs-document-title" content={pub?.document?.title} />
      </Head>
      <SiteHead title={pub?.document?.title} titleHref={`/d/${documentId}`} />
      <PageSection.Root flex={1}>
        <PublicationContextSidebar
          group={contextGroup}
          activePathName={pathName || ''}
        />
        <PageSection.Content>
          {pub ? (
            <PublicationContent publication={pub} />
          ) : publication.isLoading ? (
            <PublicationPlaceholder />
          ) : (
            <YStack
              padding="$4"
              borderRadius="$5"
              elevation="$1"
              borderColor="$color5"
              borderWidth={1}
              backgroundColor="$color3"
              gap="$3"
            >
              <SizableText size="$5" fontWeight="800" textAlign="center">
                Document not found.
              </SizableText>
              <SizableText color="$color9">
                Document Id: {documentId}
              </SizableText>
              <SizableText color="$color9">version: {version}</SizableText>
            </YStack>
          )}
        </PageSection.Content>
        <PageSection.Side>
          <YStack className="publication-sidenav-sticky">
            <PublicationMetadata publication={pub} pathName={pathName} />
            <WebTipping
              docId={documentId}
              editors={pub?.document?.editors || []}
            />
          </YStack>
        </PageSection.Side>
      </PageSection.Root>
      <Footer />
    </YStack>
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
            <SizableText
              key={index}
              fontSize={isHeading ? 24 : undefined}
              fontWeight={isHeading || isBold ? '800' : '400'}
              textDecorationLine={textDecorationLine || undefined}
              fontStyle={content.styles.italic ? 'italic' : undefined}
              fontFamily={content.styles.code ? '$mono' : undefined}
            >
              {content.text}
            </SizableText>
          )
        }
        if (content.type === 'link') {
          let matchesPattern = matchesHypermediaPattern(content.href)
          const href = matchesPattern
            ? hmLinkToSitePath(content.href)
            : content.href
          return (
            <a
              href={href}
              key={index}
              className={matchesPattern ? 'hm-link' : 'link'}
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

function StaticSectionBlock({block}: {block: HeadingBlock | ParagraphBlock}) {
  const inline = useMemo(
    () => serverBlockToEditorInline(new Block(block)),
    [block],
  )
  // const isBlockquote = block.attributes?.type === 'blockquote'
  return (
    <YStack
      id={`${block.id}-block`}
      // paddingLeft={isBlockquote ? 20 : 0}
      // borderLeftWidth={isBlockquote ? 1 : 0}
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

function stripHMLinkPrefix(link: string) {
  return link.replace(/^hm:\//, '')
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
    if (blockId) {
      const blockNode = getBlockNodeById(
        embed.data?.publication?.document?.children,
        blockId,
      )
      content = blockNode ? (
        <StaticBlockNode block={blockNode} />
      ) : (
        <Text>Block not found.</Text>
      )
    } else {
      content = (
        <>
          {embed.data?.publication?.document?.children?.map((block) => (
            <StaticBlockNode block={block} key={block?.block?.id} ctx={{}} />
          ))}
        </>
      )
    }
  }
  return (
    <YStack
      id={`${block.id}-block`}
      data-ref={reference}
      transform="translateX(-19px)"
      width="calc(100% + 16px)"
      position="relative"
    >
      <YStack
        padding="$4"
        paddingVertical="$2"
        borderRadius="$4"
        backgroundColor="$color5"
        hoverStyle={{
          cursor: 'pointer',
        }}
        onPress={() => {
          const ref = stripHMLinkPrefix(block.ref)
          router.push(ref)
        }}
        href={stripHMLinkPrefix(block.ref)}
      >
        {content}
        {/* <EmbedMetadata embed={embed} /> */}
      </YStack>
    </YStack>
  )
}

function StaticBlock({block}: {block: HMBlock}) {
  let niceBlock = block as PresentationBlock // todo, validation

  if (niceBlock.type === 'paragraph' || niceBlock.type === 'heading') {
    return <StaticSectionBlock block={niceBlock} />
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
      // @ts-expect-error
      id={`${niceBlock.id}-block`}
      // @ts-expect-error
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
  block: HMBlockNode
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
          />
        </XStack>
      )}
    </YStack>
  )
}

function PublicationPlaceholder() {
  return (
    <YStack gap="$6">
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
    </YStack>
  )
}

function BlockPlaceholder() {
  return (
    <YStack gap="$3">
      <YStack width="90%" height={16} backgroundColor="$color6" />
      <YStack height={16} backgroundColor="$color6" />
      <YStack width="75%" height={16} backgroundColor="$color6" />
      <YStack width="60%" height={16} backgroundColor="$color6" />
    </YStack>
  )
}
