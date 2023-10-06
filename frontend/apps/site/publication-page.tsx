import {
  Account,
  Block,
  EmbedBlock,
  FileBlock,
  HMBlockChildrenType,
  HeadingBlock,
  ImageBlock,
  InlineContent,
  ParagraphBlock,
  PresentationBlock,
  Publication,
  UnpackedHypermediaId,
  VideoBlock,
  createHmDocLink,
  createPublicWebHmUrl,
  formatBytes,
  getCIDFromIPFSUrl,
  groupDocUrl,
  idToUrl,
  isHypermediaScheme,
  serverBlockToEditorInline,
  unpackDocId,
  unpackHmId,
} from '@mintter/shared'
import {
  ArrowRight,
  Button,
  Copy,
  ExternalLink,
  File,
  FontSizeTokens,
  PageSection,
  Share,
  SideSection,
  SideSectionTitle,
  SizableText,
  Spinner,
  Tooltip,
  XStack,
  YStack,
  useMedia,
} from '@mintter/ui'
import {DehydratedState} from '@tanstack/react-query'
import {cidURL} from 'ipfs'
import {NextLink} from 'next-link'
import Head from 'next/head'
import {useRouter} from 'next/router'
import {useMemo, useState} from 'react'
import {DimensionValue} from 'react-native'
import {WebTipping} from 'web-tipping'
import Footer from './footer'
import {PublicationMetadata} from './publication-metadata'
import {HMBlock, HMBlockNode, HMGroup, HMPublication} from './server/json-hm'
import {SiteHead} from './site-head'
import {trpc} from './trpc'

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
}

let blockVerticalPadding: FontSizeTokens = '$4'
let blockHorizontalPadding: FontSizeTokens = '$4'
let blockBorderRadius: FontSizeTokens = '$3'

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
  const media = useMedia()

  console.log(`== ~ media:`, media)
  const publication = trpc.publication.get.useQuery({
    documentId: documentId,
    versionId: version || '',
  })

  const pub = publication.data?.publication
  return (
    <>
      <Head>
        <meta name="hyperdocs-entity-id" content={pub?.document?.id} />
        <meta name="hyperdocs-entity-version" content={pub?.version} />
        <meta name="hyperdocs-entity-title" content={pub?.document?.title} />
        {/* legacy mintter metadata */}
        <meta name="hyperdocs-document-id" content={pub?.document?.id} />
        <meta name="hyperdocs-document-version" content={pub?.version} />
        <meta name="hyperdocs-document-title" content={pub?.document?.title} />
      </Head>
      <SiteHead
        siteTitle={contextGroup?.title}
        pageTitle={pub?.document?.title}
        siteSubheading={contextGroup?.description}
      />
      <PageSection.Root>
        <PublicationContextSidebar
          group={contextGroup}
          activePathName={pathName || ''}
          display={media.gtMd ? 'inherit' : 'none'}
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
            >
              <Button
                onPress={() =>
                  window.open(
                    createHmDocLink(documentId, pub?.version),
                    '_blank',
                  )
                }
                size="$2"
                chromeless
                icon={Share}
              >
                <XStack flex={1} alignItems="center">
                  <SizableText size="$2">Open in Mintter app</SizableText>
                </XStack>
              </Button>
            </WebTipping>
            {/* 
            // TODO: CRITICAL: add more actions here (open in mintter app)
            // TODO: CRITICAL: make the web tipping button less "prominent"
            */}
          </YStack>
        </PageSection.Side>
        <PublicationContextSidebar
          group={contextGroup}
          activePathName={pathName || ''}
          display={media.gtMd ? 'none' : 'inherit'}
        />
      </PageSection.Root>
      <Footer />
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

          let children: any = content.text

          if (content.styles.bold) {
            children = <b>{children}</b>
          }

          if (content.styles.italic) {
            children = <i>{children}</i>
          }

          if (content.styles.underline) {
            children = <u>{children}</u>
          }

          if (content.styles.code) {
            children = (
              <SizableText
                paddingHorizontal="$2"
                paddingVertical="$1"
                backgroundColor="$color7"
                borderRadius="$2"
              >
                <code style={{fontSize: '0.95em'}}>{children}</code>
              </SizableText>
            )
          }

          if (content.styles.backgroundColor) {
            children = (
              <span style={{backgroundColor: content.styles.backgroundColor}}>
                {children}
              </span>
            )
          }

          if (content.styles.strike) {
            children = <s>{children}</s>
          }

          if (content.styles.textColor) {
            children = (
              <SizableText color={content.styles.textColor}>
                {children}
              </SizableText>
            )
          }

          return (
            <SizableText
              size="$6"
              key={index}
              textDecorationLine={textDecorationLine || undefined}
            >
              {children}
            </SizableText>
          )
        }
        if (content.type === 'link') {
          const href = isHypermediaScheme(content.href)
            ? idToUrl(content.href, null)
            : content.href

          const isExternal = isHypermediaScheme(content.href)
          return (
            href && (
              <Tooltip content={href}>
                <a
                  href={href}
                  key={index}
                  className={isExternal ? 'hm-link' : 'link'}
                  style={{
                    cursor: 'pointer',
                    display: 'inline-block',
                  }}
                >
                  <InlineContentView inline={content.content} />
                  {isExternal ? <ExternalLink size={10} /> : null}
                </a>
              </Tooltip>
            )
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
  const isHeading = block.type == 'heading'
  return (
    <YStack
      id={`${block.id}-block`}
      // paddingLeft={isBlockquote ? 20 : 0}
      // borderLeftWidth={isBlockquote ? 1 : 0}
      borderLeftColor={'blue'}
    >
      <SizableText
        size={isHeading ? '$7' : undefined}
        fontWeight={isHeading ? 'bold' : undefined}
        tag={isHeading ? 'h2' : 'p'}
      >
        <InlineContentView
          inline={inline}
          style={{
            heading: block.type === 'heading',
          }}
        />
      </SizableText>
    </YStack>
  )
}

function StaticImageBlock({block}: {block: ImageBlock}) {
  const cid = getCIDFromIPFSUrl(block?.ref)
  if (!cid) return null
  return (
    <XStack
      backgroundColor="$color3"
      borderColor="$color4"
      borderWidth={1}
      borderRadius={blockBorderRadius}
      overflow="hidden"
      hoverStyle={{
        backgroundColor: '$color4',
      }}
    >
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
  // return <img src={`${process.env.GRPC_HOST}/ipfs/${cid}`} />
}

function stripHMLinkPrefix(link: string) {
  return link.replace(/^hm:\//, '')
}

function StaticEmbedBlock({block}: {block: EmbedBlock}) {
  const reference = block.ref
  const docId = unpackDocId(reference)
  const router = useRouter()
  let embed = trpc.publication.get.useQuery(
    {
      documentId: docId?.docId,
      versionId: docId?.version,
    },
    {enabled: !!docId},
  )
  let content = <Spinner />
  if (embed.data?.publication?.document?.children) {
    if (docId?.blockRef) {
      const blockNode = getBlockNodeById(
        embed.data?.publication?.document?.children,
        docId.blockRef,
      )
      content = blockNode ? (
        <StaticBlockNode block={blockNode} />
      ) : (
        <SizableText>Block not found.</SizableText>
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
        // padding={blockVerticalPadding}
        // paddingVertical={blockVerticalPadding}
        // borderRadius={blockBorderRadius}
        // backgroundColor="$color5"
        // marginRight={blockHorizontalPadding}
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

function StaticBlock({block, isList}: {block: HMBlock; isList?: boolean}) {
  let niceBlock = block as PresentationBlock // todo, validation

  if (niceBlock.type == 'paragraph' || niceBlock.type == 'heading') {
    return <StaticSectionBlock block={niceBlock} isList={isList} />
  }

  if (niceBlock.type == 'image') {
    return <StaticImageBlock block={niceBlock} isList={isList} />
  }
  if (niceBlock.type == 'embed') {
    return <StaticEmbedBlock block={niceBlock} isList={isList} />
  }
  if (niceBlock.type == 'code') {
    let _content = (
      <pre>
        <code>{block.text}</code>
      </pre>
    )

    return isList ? <li>{_content}</li> : _content
  }

  if (niceBlock.type == 'file') {
    return <StaticFileBlock block={niceBlock} />
  }

  if (niceBlock.type == 'video') {
    return <StaticVideoBlock block={niceBlock} isList={isList} />
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
      padding={blockVerticalPadding}
      paddingVertical={blockVerticalPadding}
      marginRight={blockHorizontalPadding}
      backgroundColor="$color3"
      borderColor="$color4"
      borderWidth={1}
      borderRadius={blockBorderRadius}
      overflow="hidden"
      hoverStyle={{
        backgroundColor: '$color4',
      }}
      id={id}
    >
      <SizableText color="$color8" size="$6">
        {message}
      </SizableText>
    </YStack>
  )
}

type PublicationViewContext = {
  headingDepth?: number
  enableBlockCopy?: boolean
  ref?: {
    docId?: string
    docVersion?: string
  }
}

function StaticBlockNode({
  childrenType,
  block,
  ctx,
}: {
  block: HMBlockNode
  ctx?: PublicationViewContext
  childrenType?: HMBlockChildrenType
}) {
  const [isHovering, setIsHovering] = useState(false)

  const children =
    (block.children?.length || 0) > 0 ? (
      <YStack
        onHoverIn={() => setIsHovering(false)}
        onHoverOut={() => setIsHovering(true)}
        tag={block.block?.attributes?.childrenType}
        start={
          block.block?.attributes?.childrenType == 'ol'
            ? (block.block?.attributes?.start as DimensionValue) || 1
            : 'auto'
        }
        display="block"
      >
        {block.children?.map((child, index) => (
          <StaticBlockNode
            childrenType={
              block.block?.attributes?.childrenType as HMBlockChildrenType
            }
            key={child.block?.id || index}
            block={child}
            ctx={ctx}
          />
        ))}
      </YStack>
    ) : null
  const id = block.block?.id || 'unknown-block'
  const isList = childrenType == 'ol' || childrenType == 'ul'
  const docIds = ctx?.ref?.docId ? unpackDocId(ctx?.ref?.docId) : null
  return (
    <YStack
      paddingVertical="$2"
      paddingLeft={blockHorizontalPadding}
      id={id}
      onHoverIn={() => setIsHovering(true)}
      onHoverOut={() => setIsHovering(false)}
      position="relative"
      // borderWidth={1}
      // borderColor="$color6"
      borderRadius={blockBorderRadius}
      backgroundColor={isHovering ? '$backgroundHover' : 'transparent'}
      // backgroundColor={
      //   window.location.hash == `#${block.block?.id}`
      //     ? '$yellow5'
      //     : isHovering
      //     ? '$color4'
      //     : 'transparent'
      // }
      tag={isList ? 'li' : undefined}
      marginLeft={isList ? blockHorizontalPadding : undefined}
      style={
        isList
          ? {
              display: 'list-item',
              listStyleType: childrenType == 'ol' ? 'decimal' : 'disc',
            }
          : undefined
      }
    >
      {block.block && <StaticBlock isList={isList} block={block.block} />}
      {children}
      {ctx?.enableBlockCopy && (
        <XStack
          bg="$background"
          position="absolute"
          top={0}
          right={0}
          opacity={isHovering ? 1 : 0}
          overflow="hidden"
          borderRadius={blockBorderRadius}
        >
          <Tooltip content={`Copy block reference`}>
            {docIds?.eid && (
              <Button
                tag="a"
                size="$2"
                chromeless
                href={`#${id}`}
                icon={Copy}
                onPress={() => {
                  navigator.clipboard.writeText(
                    createPublicWebHmUrl('d', docIds?.eid, {
                      version: ctx?.ref?.docVersion,
                      blockRef: id,
                      hostname: `${window.location.protocol}//${window.location.host}`,
                    }),
                  )
                }}
              />
            )}
          </Tooltip>
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

export function PublicationContent({
  publication,
}: {
  publication: HMPublication | undefined
}) {
  // This removes the first block from the document content if it's not a media element (embed, image, video...)
  let blocks = useMemo(() => {
    let _b = publication?.document?.children

    if (!_b?.length || (_b.length == 1 && _b[0].block?.type != 'embed'))
      return []

    // check if the first block has content or not.
    if (
      _b[0].block?.type &&
      ['embed', 'image', 'video'].includes(_b[0].block?.type)
    )
      return _b

    let [_firstBlock, ...restBlocks] = _b

    return restBlocks
  }, [publication?.document?.children])
  return (
    <YStack>
      {publication?.document?.children?.map((block, index) => (
        <StaticBlockNode
          block={block}
          key={block.block?.id || index}
          ctx={{
            enableBlockCopy: true,
            ref: {
              docId: publication?.document?.id,
              docVersion: publication.version,
            },
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

export function useGroupContentUrl(
  groupEid: string | undefined,
  groupVersion?: string,
  pathName?: string,
) {
  const siteInfo = trpc.siteInfo.get.useQuery()
  if (!groupEid) return null
  const rootPathName = pathName === '/' ? '/' : pathName
  return siteInfo.data?.groupEid === groupEid
    ? rootPathName
    : groupDocUrl(groupEid, groupVersion, pathName || '/')
}

function GroupSidebarContentItem({
  item,
  groupVersion,
  groupId,
  activePathName,
}: {
  item: ContentItem
  groupVersion: string | undefined
  groupId: UnpackedHypermediaId
  activePathName: string
}) {
  const contentUrl = useGroupContentUrl(
    groupId.eid,
    groupVersion,
    item.pathName,
  )
  if (!contentUrl) return null
  return (
    <Button
      key={item.pathName}
      iconAfter={activePathName === item.pathName ? <ArrowRight /> : null}
      tag="a"
      href={contentUrl}
      size="$3"
      chromeless
      justifyContent="flex-start"
      backgroundColor={
        activePathName === item.pathName ? '$backgroundHover' : 'transparent'
      }
      hoverStyle={{
        backgroundColor: '$backgroundHover',
      }}
    >
      {item?.publication?.document?.title}
    </Button>
  )
}

type ContentItem = {
  publication: null | HMPublication
  pathName: string
  version: string
  docId: string
}

function GroupSidebarContent({
  group,
  activePathName,
  content,
}: {
  activePathName: string
  group?: HMGroup
  content?: Array<null | ContentItem>
}) {
  const groupId = group?.id ? unpackHmId(group?.id) : null
  return (
    <SideSection>
      {groupId?.eid ? (
        <XStack paddingHorizontal="$3">
          <SideSectionTitle>Site Content:</SideSectionTitle>
        </XStack>
      ) : null}
      {content?.map((item) => {
        if (!item || !groupId?.eid) return null
        return (
          <GroupSidebarContentItem
            item={item}
            groupId={groupId}
            groupVersion={group?.version}
            activePathName={activePathName}
          />
        )
      })}
    </SideSection>
  )
}

function PublicationContextSidebar({
  group,
  activePathName,
  ...props
}: {
  group?: HMGroup | null
  activePathName: string
}) {
  const groupContent = trpc.group.listContent.useQuery(
    {
      groupId: group?.id || '',
      version: group?.version || '',
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

  console.log(`== ~ groupSidebarContent:`, groupSidebarContent)
  return (
    <PageSection.Side show={props.display != 'none'} {...props}>
      {groupSidebarContent}
    </PageSection.Side>
  )
}

export function StaticFileBlock({block}: {block: FileBlock}) {
  let cid = useMemo(() => getCIDFromIPFSUrl(block.ref), [block.ref])
  return (
    <NextLink
      href={`/ipfs/${cid}`}
      target="_blank"
      style={{textDecoration: 'none'}}
    >
      <Tooltip content={`Download ${block.attributes.name}`}>
        <YStack
          backgroundColor="$color3"
          borderColor="$color4"
          borderWidth={1}
          borderRadius={blockBorderRadius}
          // marginRight={blockHorizontalPadding}
          overflow="hidden"
          hoverStyle={{
            backgroundColor: '$color4',
          }}
        >
          <XStack
            borderWidth={0}
            outlineWidth={0}
            padding="$4"
            ai="center"
            space
          >
            <File size={18} />

            <SizableText
              size="$5"
              maxWidth="17em"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              userSelect="text"
            >
              {block.attributes.name}
            </SizableText>
            {block.attributes.size && (
              <SizableText
                paddingTop="$1"
                color="$color10"
                size="$2"
                minWidth="4.5em"
              >
                {formatBytes(parseInt(block.attributes.size))}
              </SizableText>
            )}
          </XStack>
        </YStack>
      </Tooltip>
    </NextLink>
  )
}

function StaticVideoBlock({
  block,
  isList,
}: {
  block: VideoBlock
  isList?: boolean
}) {
  const ref = block.ref || ''
  return ref ? (
    <YStack
      backgroundColor="$color3"
      borderColor="$color8"
      borderWidth={2}
      borderRadius="$2"
      overflow="hidden"
      hoverStyle={{
        backgroundColor: '$color4',
      }}
      paddingBottom="56.25%"
      position="relative"
      height={0}
    >
      {ref.startsWith('ipfs://') ? (
        <XStack
          tag="video"
          top={0}
          left={0}
          position="absolute"
          width="100%"
          height="100%"
          // @ts-expect-error
          contentEditable={false}
          playsInline
          controls
          preload="metadata"
        >
          <source
            src={`/ipfs/${block.ref.replace('ipfs://', '')}`}
            type={getSourceType(block.attributes.name)}
          />
          Something is wrong with the video file.
        </XStack>
      ) : (
        <XStack
          tag="iframe"
          top={0}
          left={0}
          position="absolute"
          width="100%"
          height="100%"
          // @ts-expect-error
          src={block.ref}
          frameBorder="0"
          allowFullScreen
        />
      )}
    </YStack>
  ) : null
}

function getSourceType(name?: string) {
  if (!name) return
  const nameArray = name.split('.')
  return `video/${nameArray[nameArray.length - 1]}`
}
