import {
  Account,
  BACKEND_FILE_URL,
  Block,
  BlockNode,
  Group,
  HMBlockChildrenType,
  HMBlockFile,
  HMInlineContent,
  Publication,
  formatBytes,
  getCIDFromIPFSUrl,
  idToUrl,
  isHypermediaScheme,
  toHMInlineContent,
  unpackHmId,
} from '@mintter/shared'
import {
  ColorProp,
  ExternalLink,
  File,
  FontSizeTokens,
  SizableText,
  SizableTextProps,
  Text,
  TextProps,
  Tooltip,
  XStack,
  YStack,
  YStackProps,
} from '@mintter/ui'

import {
  PropsWithChildren,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react'
import './static-styles.css'

let blockVerticalPadding: FontSizeTokens = '$4'
let blockHorizontalPadding: FontSizeTokens = '$4'
let blockBorderRadius = '$3'

export type EntityComponentsRecord = {
  StaticAccount: React.FC<StaticEmbedProps>
  StaticGroup: React.FC<StaticEmbedProps>
  StaticPublication: React.FC<StaticEmbedProps>
}

export type StaticPublicationContextValue = {
  entityComponents: EntityComponentsRecord
  onLinkClick: (dest: string, e: any) => void
}

export const staticPublicationContext =
  createContext<StaticPublicationContextValue | null>(null)

export type StaticEmbedProps = StaticBlockProps & ReturnType<typeof unpackHmId>

export function StaticPublicationProvider({
  children,
  entityComponents,
  onLinkClick,
}: PropsWithChildren<StaticPublicationContextValue>) {
  return (
    <staticPublicationContext.Provider value={{entityComponents, onLinkClick}}>
      {children}
    </staticPublicationContext.Provider>
  )
}

export function useStaticPublicationContext() {
  let context = useContext(staticPublicationContext)

  if (!context) {
    throw new Error(
      `Please wrap <StaticPublication /> with <StaticPublicationProvider />`,
    )
  }

  return context
}

function debugStyles(color: ColorProp = '$color7') {
  // return {
  //   borderWidth: 1,
  //   borderColor: color,
  // }
  return {}
}

export function StaticPublication({publication}: {publication: Publication}) {
  return (
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
  return <YStack {...props}>{children}</YStack>
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
      <Text {...styles} fontFamily="$body" userSelect="none">
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
  embedDepth?: number
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
          embedDepth={
            props.embedDepth ? props.embedDepth + 1 : props.embedDepth
          }
        />
      ))
    : null

  const headingStyles = useMemo(() => {
    if (blockNode.block?.type == 'heading') {
      return headingMarginStyles
    }

    return {}
  }, [blockNode.block, headingMarginStyles])

  const isEmbed = blockNode.block.type == 'embed'

  return (
    <YStack
      overflow="hidden"
      borderRadius="$3"
      marginLeft={!isEmbed ? '1.5em' : undefined}
      onHoverIn={() => (props.embedDepth ? setIsHovering(true) : undefined)}
      onHoverOut={() => (props.embedDepth ? setIsHovering(false) : undefined)}
      backgroundColor={
        props.embedDepth
          ? 'transparent'
          : isHovering
          ? '$color5'
          : 'transparent'
      }
      className="static-blocknode"
    >
      <XStack
        padding={isEmbed ? 0 : '$3'}
        alignItems="baseline"
        {...headingStyles}
        {...debugStyles('red')}
      >
        <BlockNodeMarker
          block={blockNode.block!}
          childrenType={childrenType}
          index={props.index}
          start={props.start}
        />
        <StaticBlock block={blockNode.block!} depth={depth} />
      </XStack>
      {bnChildren ? (
        <StaticGroup
          onHoverIn={() =>
            props.embedDepth ? setIsHovering(false) : undefined
          }
          onHoverOut={() =>
            props.embedDepth ? setIsHovering(true) : undefined
          }
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

export const blockStyles: YStackProps = {
  width: '100%',
  alignSelf: 'center',
  flex: 1,
  ...debugStyles('blue'),
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

export type StaticBlockProps = {
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

  if (props.block.type == 'video') {
    return <StaticBlockVideo {...props} depth={props.depth} />
  }

  if (props.block.type == 'embed') {
    return (
      <StaticBlockEmbed
        {...props}
        blockRef={props.block.ref}
        depth={props.depth}
      />
    )
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
    let realValue = value - 8
    return {
      marginTop: realValue,
      marginBottom: realValue / 3,
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

function StaticBlockVideo({block, depth}: StaticBlockProps) {
  let inline = useMemo(() => toHMInlineContent(new Block(block)), [])
  const ref = block.ref || ''

  return (
    <YStack
      {...blockStyles}
      className="block-static block-video"
      paddingVertical="$3"
      gap="$2"
      paddingBottom="56.25%"
      position="relative"
      height={0}
    >
      {ref ? (
        ref.startsWith('ipfs://') ? (
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
        )
      ) : (
        <SizableText>Video block wrong state</SizableText>
      )}
      {inline.length ? (
        <SizableText opacity={0.7} size="$2">
          <InlineContentView inline={inline} />
        </SizableText>
      ) : null}
    </YStack>
  )
}

type LinkType = null | 'basic' | 'hypermedia'

function hmTextColor(linkType: LinkType): string {
  if (linkType === 'basic') return '$blue11'
  if (linkType === 'hypermedia') return '$mint11'
  return '$color12'
}

function InlineContentView({
  inline,
  style,
  linkType = null,
  ...props
}: SizableTextProps & {
  inline: HMInlineContent[]
  linkType?: LinkType
}) {
  const {onLinkClick} = useStaticPublicationContext()
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
          const underline = linkType || content.styles.underline
          if (underline) {
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

          // does anything use this?
          // if (content.styles.backgroundColor) {
          //   children = (
          //     <span style={{backgroundColor: content.styles.backgroundColor}}>
          //       {children}
          //     </span>
          //   )
          // }

          if (content.styles.strike) {
            children = <s>{children}</s>
          }

          // does anything use this?
          // if (content.styles.textColor) {
          //   children = (
          //     <span style={{color: content.styles.textColor}}>{children}</span>
          //   )
          // }

          return (
            <Text
              key={index}
              color={hmTextColor(linkType)}
              textDecorationColor={hmTextColor(linkType)}
              style={{textDecorationLine}}
            >
              {children}
            </Text>
          )
        }
        if (content.type === 'link') {
          const href = isHypermediaScheme(content.href)
            ? idToUrl(content.href, null)
            : content.href
          if (!href) return null
          const isHmLink = isHypermediaScheme(content.href)
          return (
            <a
              href={href}
              key={index}
              onClick={(e) => onLinkClick(content.href, e)}
              style={{
                cursor: 'pointer',
                display: 'inline',
                textDecoration: 'none',
              }}
            >
              <InlineContentView
                inline={content.content}
                linkType={isHmLink ? 'hypermedia' : 'basic'}
              />
            </a>
          )
        }
        return null
      })}
    </span>
  )
}

function stripHMLinkPrefix(link: string) {
  return link.replace(/^hm:\//, '')
}

export function StaticBlockEmbed(props: StaticBlockProps & {blockRef: string}) {
  console.log('EMBED HERE', props)
  const EmbedTypes = useStaticPublicationContext().entityComponents
  const id = unpackHmId(props.blockRef)

  if (id?.type == 'a') {
    return <EmbedTypes.StaticAccount {...props} {...id} />
  }

  if (id?.type == 'g') {
    return <EmbedTypes.StaticGroup {...props} {...id} />
  }

  if (id?.type == 'd') {
    console.log(`== ~ StaticBlockEmbed ~ DOCUMENT:`, id)
    return <EmbedTypes.StaticPublication {...props} {...id} />
  }

  return <DefaultStaticBlockUnknown {...props} {...id} />
}

export function DefaultStaticBlockUnknown(props: StaticBlockProps) {
  return (
    <YStack {...blockStyles} className="block-static block-embed" tag="pre">
      <SizableText {...inlineContentProps} tag="code" fontFamily="$mono">
        Unknown Embed here: {props.block.ref}
      </SizableText>
      <pre>
        <code>{JSON.stringify(props, null, 3)}</code>
      </pre>
    </YStack>
  )
}

export function getBlockNodeById(
  blocks: Array<BlockNode>,
  blockId: string,
): BlockNode | null {
  if (!blockId) return null

  let res: BlockNode | undefined
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

function getSourceType(name?: string) {
  if (!name) return
  const nameArray = name.split('.')
  return `video/${nameArray[nameArray.length - 1]}`
}
