import {
  Block,
  HMBlock,
  HMBlockChildrenType,
  HMBlockEmbed,
  HMBlockFile,
  HMBlockHeading,
  HMBlockImage,
  HMBlockNode,
  HMBlockParagraph,
  HMBlockVideo,
  HMInlineContent,
  HMPublication,
  createPublicWebHmUrl,
  formatBytes,
  getCIDFromIPFSUrl,
  idToUrl,
  isHypermediaScheme,
  toHMInlineContent,
  unpackDocId,
} from '@mintter/shared'
import {
  Button,
  Copy,
  ExternalLink,
  File,
  FontSizeTokens,
  SizableText,
  Spinner,
  Tooltip,
  XStack,
  YStack,
} from '@mintter/ui'
import {useRouter} from 'next/router'
import {useMemo, useState} from 'react'
import {DimensionValue} from 'react-native'

let blockVerticalPadding: FontSizeTokens = '$4'
let blockHorizontalPadding: FontSizeTokens = '$4'
let blockBorderRadius = '$3'

function StaticSectionBlock({
  block,
  isList,
}: {
  block: HMBlockParagraph | HMBlockHeading
  isList?: boolean
}) {
  const inline = useMemo(() => toHMInlineContent(new Block(block)), [block])
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
            heading: isHeading,
          }}
        />
      </SizableText>
    </YStack>
  )
}

function StaticImageBlock({
  block,
  isList,
}: {
  block: HMBlockImage
  isList?: boolean
}) {
  const cid = getCIDFromIPFSUrl(block?.ref)
  if (!cid) return null
  return (
    <XStack
      backgroundColor="$color3"
      borderColor="$color4"
      borderWidth={1}
      borderRadius={blockBorderRadius as any}
      overflow="hidden"
      hoverStyle={{
        backgroundColor: '$color4',
      }}
    >
      <img
        id={`${block.id}-block`}
        alt={block.attributes?.alt}
        src={`/ipfs/${cid}`}
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

function StaticEmbedBlock({
  block,
  isList,
}: {
  block: HMBlockEmbed
  isList?: boolean
}) {
  const reference = block.ref
  const docId = unpackDocId(reference)
  const router = useRouter()
  let embed = trpc.publication.get.useQuery(
    {
      documentId: docId?.docId,
      versionId: docId?.version || undefined,
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
          {embed.data?.publication?.document?.children?.map(
            (block: HMBlockNode) => (
              <StaticBlockNode block={block} key={block?.block?.id} ctx={{}} />
            ),
          )}
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
  let niceBlock = block

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
      borderRadius={blockBorderRadius as any}
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

export function StaticBlockNode({
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
            key={child.block.id || index}
            block={child}
            ctx={ctx}
            childrenType={
              block.block?.attributes?.childrenType as HMBlockChildrenType
            }
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
      borderRadius={blockBorderRadius as any}
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
          backgroundColor="$background"
          position="absolute"
          top={0}
          right={0}
          opacity={isHovering ? 1 : 0}
          overflow="hidden"
          borderRadius={blockBorderRadius as any}
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

export function PublicationContent({
  publication,
}: {
  publication: HMPublication | undefined
}) {
  // This removes the first block from the document content if it's not a media element (embed, image, video...)
  let blocks = useMemo(() => {
    let _b = publication?.document?.children

    if (
      !_b?.length ||
      (_b.length == 1 &&
        !['embed', 'image', 'video'].includes(_b[0].block?.type))
    )
      return []

    // check if the first block has content or not.
    if (
      _b[0].block?.type &&
      ['embed', 'image', 'video'].includes(_b[0].block?.type)
    )
      return _b

    let [_firstBlock, ...restBlocks] = _b

    if (_firstBlock.children?.length) {
      restBlocks = [..._firstBlock.children, ...restBlocks]
    }

    return restBlocks
  }, [publication?.document?.children])
  return (
    <YStack>
      {blocks.map((block, index) => (
        <StaticBlockNode
          block={block}
          key={block.block?.id || index}
          ctx={{
            enableBlockCopy: true,
            ref: {
              docId: publication?.document?.id,
              docVersion: publication?.version,
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

export function StaticFileBlock({block}: {block: HMBlockFile}) {
  let cid = useMemo(() => getCIDFromIPFSUrl(block.ref), [block.ref])
  return (
    <Tooltip content={`Download ${block.attributes.name}`}>
      <YStack
        backgroundColor="$color3"
        borderColor="$color4"
        borderWidth={1}
        borderRadius={blockBorderRadius as any}
        // marginRight={blockHorizontalPadding}
        overflow="hidden"
        hoverStyle={{
          backgroundColor: '$color4',
        }}
        onPress={() => console.log('OPEN FILE', cid)}
      >
        <XStack
          borderWidth={0}
          outlineWidth={0}
          padding="$4"
          alignItems="center"
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
  )
}

function StaticVideoBlock({
  block,
  isList,
}: {
  block: HMBlockVideo
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

function InlineContentView({
  inline,
  style,
}: {
  inline: HMInlineContent[]
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
