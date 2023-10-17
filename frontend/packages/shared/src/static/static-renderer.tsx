import {
  BACKEND_FILE_URL,
  Block,
  BlockNode,
  HMBlock,
  HMBlockChildrenType,
  HMBlockEmbed,
  HMBlockFile,
  HMBlockImage,
  HMBlockNode,
  HMBlockVideo,
  HMInlineContent,
  HMPublication,
  Publication,
  formatBytes,
  getCIDFromIPFSUrl,
  idToUrl,
  isHypermediaScheme,
  toHMInlineContent,
  unpackDocId,
} from '@mintter/shared'
import {
  ExternalLink,
  File,
  FontSizeTokens,
  SizableText,
  SizableTextProps,
  Spinner,
  Text,
  TextProps,
  Tooltip,
  XStack,
  YStack,
  YStackProps,
} from '@mintter/ui'

import {useRouter} from 'next/router'
import {createContext, useMemo, useState} from 'react'
import './static-styles.css'

let blockVerticalPadding: FontSizeTokens = '$4'
let blockHorizontalPadding: FontSizeTokens = '$4'
let blockBorderRadius = '$3'

export const staticRendererContext = createContext(null)

export function StaticPublicationProvider({children}) {
  let value = useMemo(() => {
    client: undefined
  }, [])

  return (
    <staticRendererContext.Provider value={value}>
      {children}
    </staticRendererContext.Provider>
  )
}

export function StaticPublication({publication}: {publication: Publication}) {
  return (
    <YStack
      paddingVertical={80}
      width="100%"
      maxWidth="calc(100ch + 20vw)"
      paddingHorizontal="10vw"
      alignSelf="center"
    >
      <StaticGroup childrenType={'group'}>
        {publication.document?.children.map((bn, idx) => (
          <StaticBlockNode
            key={bn.block?.id}
            blockNode={bn}
            depth={1}
            childrenType="group"
            index={idx}
          />
        ))}
      </StaticGroup>
    </YStack>
  )
}

export function StaticGroup({
  children,
  childrenType = 'group',
  start,
  ...props
}: YStackProps & {
  childrenType?: HMBlockChildrenType
  start?: any
}) {
  return (
    <YStack {...props} borderWidth={1} borderColor="$color7">
      {children}
    </YStack>
  )
}

function BlockNodeMarker({
  block,
  childrenType,
  index = 0,
  start,
  headingTextStyles,
}: {
  block: Block
  childrenType?: string
  start?: string
  index?: number
  headingTextStyles: TextProps
}) {
  let styles = useMemo(
    () =>
      childrenType == 'ol'
        ? ({
            position: 'absolute',
            right: '27%',
            marginTop: 6,
          } satisfies SizableTextProps)
        : {},
    [childrenType],
  )
  let marker

  if (childrenType == 'ol') {
    marker = `${index + Number(start)}.`
  }

  if (childrenType == 'ul') {
    marker = '•'
  }

  if (!marker) return null

  return (
    <XStack
      flex={0}
      width={33}
      height={33}
      alignItems="center"
      justifyContent="center"
    >
      <Text {...styles} fontFamily="$body">
        {marker}
      </Text>
    </XStack>
  )
}

export function StaticBlockNode({
  blockNode,
  depth = 1,
  childrenType = 'group',
  ...props
}: {
  blockNode: BlockNode
  index: number
  copyBlock?: {
    docId: string
    version: string
  }
  depth?: number
  start?: string | number
  childrenType?: HMBlockChildrenType | string
}) {
  const headingMarginStyles = useHeadingMarginStyles(depth)
  const [isHovering, setIsHovering] = useState(false)

  let bnChildren = blockNode.children?.length
    ? blockNode.children.map((bn, index) => (
        <StaticBlockNode
          key={bn.block!.id}
          depth={depth + 1}
          blockNode={bn}
          childrenType={blockNode.block!.attributes?.childrenType}
          start={blockNode.block?.attributes.start}
          index={index}
        />
      ))
    : null

  const isList = useMemo(
    () => childrenType == 'ol' || childrenType == 'ul',
    [childrenType],
  )

  const headingStyles = useMemo(() => {
    if (blockNode.block?.type == 'heading') {
      return headingMarginStyles
    }

    return {}
  }, [blockNode.block, headingMarginStyles])

  return (
    <YStack
      marginLeft="1.5em"
      onHoverIn={() => setIsHovering(true)}
      onHoverOut={() => setIsHovering(false)}
      backgroundColor={isHovering ? '$color5' : 'transparent'}
      className="blocknode-static"
    >
      <XStack
        borderWidth={1}
        borderColor="red"
        paddingHorizontal="$2"
        paddingVertical="$1"
        alignItems="baseline"
        {...headingStyles}
      >
        <BlockNodeMarker
          block={blockNode.block!}
          childrenType={childrenType}
          index={props.index}
          start={props.start}
        />
        <StaticBlock block={blockNode.block!} isList={isList} depth={depth} />
      </XStack>
      {bnChildren ? (
        <StaticGroup
          onHoverIn={() => setIsHovering(false)}
          onHoverOut={() => setIsHovering(true)}
          childrenType={childrenType as HMBlockChildrenType}
          start={props.start}
          display="block"
        >
          {bnChildren}
        </StaticGroup>
      ) : null}
    </YStack>
  )
}

let blockStyles: YStackProps = {
  width: '100%',
  alignSelf: 'center',
  overflow: 'hidden',
  borderRadius: '$2',
  borderWidth: 1,
  borderColor: 'blue',
  flex: 1,
}

let inlineContentProps: SizableTextProps = {
  className: 'static-inlinecontent',
  fontFamily: '$editorBody',
  size: '$4',
  $gtMd: {
    size: '$5',
  },
  $gtLg: {
    size: '$6',
  },
}

type StaticBlockProps = {
  block: Block
  depth: number
}

function StaticBlock(props: StaticBlockProps) {
  if (props.block.type == 'paragraph') {
    return <StaticBlockParagraph {...props} depth={props.depth || 1} />
  }

  if (props.block.type == 'heading') {
    return <StaticBlockHeading {...props} depth={props.depth || 1} />
  }

  if (props.block.type == 'image') {
    return <StaticBlockImage {...props} depth={props.depth || 1} />
  }
}

function StaticBlockParagraph({block, depth}: StaticBlockProps) {
  let inline = useMemo(() => toHMInlineContent(new Block(block)), [block])

  return (
    <YStack {...blockStyles} className="block-static block-paragraph">
      <SizableText {...inlineContentProps}>
        <InlineContentView inline={inline} />
      </SizableText>
    </YStack>
  )
}

function StaticBlockHeading({block, depth}: StaticBlockProps) {
  let inline = useMemo(() => toHMInlineContent(new Block(block)), [block])
  let headingTextStyles = useHeadingTextStyles(depth)
  let tag = `h${depth}`

  return (
    <YStack {...blockStyles} className="block-static block-heading">
      <Text
        {...inlineContentProps}
        {...headingTextStyles}
        tag={tag}
        fontWeight="bold"
        fontFamily="$heading"
      >
        <InlineContentView inline={inline} />
      </Text>
    </YStack>
  )
}

function useHeadingTextStyles(depth: number) {
  function headingFontValues(value: number) {
    return {
      fontSize: value,
      lineHeight: value * 1.25,
    }
  }

  return useMemo(() => {
    if (depth == 1) {
      return {
        ...headingFontValues(30),
        $gtMd: headingFontValues(36),
        $gtLg: headingFontValues(42),
      } satisfies TextProps
    }

    if (depth == 2) {
      return {
        ...headingFontValues(24),
        $gtMd: headingFontValues(30),
        $gtLg: headingFontValues(36),
      } satisfies TextProps
    }

    if (depth == 3) {
      return {
        ...headingFontValues(20),
        $gtMd: headingFontValues(24),
        $gtLg: headingFontValues(30),
      } satisfies TextProps
    }

    return {
      ...headingFontValues(18),
      $gtMd: headingFontValues(20),
      $gtLg: headingFontValues(24),
    } satisfies TextProps
  }, [depth])
}

function useHeadingMarginStyles(depth: number) {
  function headingFontValues(value: number) {
    return {
      marginTop: value,
      marginBottom: value / 2,
    }
  }

  return useMemo(() => {
    if (depth == 1) {
      return {
        ...headingFontValues(30),
        $gtMd: headingFontValues(36),
        $gtLg: headingFontValues(42),
      } satisfies TextProps
    }

    if (depth == 2) {
      return {
        ...headingFontValues(24),
        $gtMd: headingFontValues(30),
        $gtLg: headingFontValues(36),
      } satisfies TextProps
    }

    if (depth == 3) {
      return {
        ...headingFontValues(20),
        $gtMd: headingFontValues(24),
        $gtLg: headingFontValues(30),
      } satisfies TextProps
    }

    return {
      ...headingFontValues(18),
      $gtMd: headingFontValues(20),
      $gtLg: headingFontValues(24),
    } satisfies TextProps
  }, [depth])
}

function StaticBlockImage({block, depth}: StaticBlockProps) {
  let inline = useMemo(() => toHMInlineContent(new Block(block)), [block])
  const cid = getCIDFromIPFSUrl(block?.ref)
  if (!cid) return null

  return (
    <YStack
      {...blockStyles}
      className="block-static block-image"
      paddingVertical="$3"
      gap="$2"
    >
      <img alt={block.attributes.alt} src={`${BACKEND_FILE_URL}/${cid}`} />
      {inline.length ? (
        <SizableText opacity={0.7} size="$2">
          <InlineContentView inline={inline} />
        </SizableText>
      ) : null}
    </YStack>
  )
}

function InlineContentView({
  inline,
  style,
  ...props
}: SizableTextProps & {
  inline: HMInlineContent[]
}) {
  return (
    <span>
      {inline.map((content, index) => {
        if (content.type === 'text') {
          let textDecorationLine:
            | 'none'
            | 'line-through'
            | 'underline'
            | 'underline line-through'
            | undefined
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
              <Text backgroundColor="$backgroundFocus" asChild>
                <code>{children}</code>
              </Text>
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
              <span style={{color: content.styles.textColor}}>{children}</span>
            )
          }

          return (
            <span key={index} style={{textDecorationLine}}>
              {children}
            </span>
          )
        }
        if (content.type === 'link') {
          const href = isHypermediaScheme(content.href)
            ? idToUrl(content.href, null)
            : content.href

          const isExternal = isHypermediaScheme(content.href)
          return (
            href && ( // <Tooltip content={href}>
              //   <SizableText
              //     key={index}
              //     display="inline"
              //     {...props}
              //     {...inlineContentProps}
              //   >
              //     <a
              //       href={href}
              //       key={index}
              //       className={isExternal ? 'hm-link' : 'link'}
              //       style={{
              //         cursor: 'pointer',
              //         display: 'inline',
              //       }}
              //     >
              //       <InlineContentView inline={content.content} />
              //       {isExternal ? <ExternalLink size={10} /> : null}
              //     </a>
              //   </SizableText>
              // </Tooltip>
              <a
                href={href}
                key={index}
                className={isExternal ? 'hm-link' : 'link'}
                style={{
                  cursor: 'pointer',
                  display: 'inline',
                }}
              >
                <InlineContentView inline={content.content} />
                {isExternal ? <ExternalLink size={10} /> : null}
              </a>
            )
          )
        }
        return null
      })}
    </span>
  )
}

// ====================================================================================================

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

function StaticBlock_({block, isList}: {block: HMBlock; isList?: boolean}) {
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
