import {
  Block,
  BlockNode,
  HMBlock,
  HMBlockChildrenType,
  HMBlockFile,
  HMBlockNode,
  HMInlineContent,
  HMPublication,
  MttLink,
  Publication,
  formatBytes,
  getCIDFromIPFSUrl,
  idToUrl,
  isHypermediaScheme,
  toHMInlineContent,
  unpackHmId,
} from '@mintter/shared'
import {
  Button,
  ColorProp,
  Copy,
  File,
  SizableText,
  SizableTextProps,
  Text,
  TextProps,
  Tooltip,
  UIAvatar,
  XStack,
  YStack,
  YStackProps,
} from '@mintter/ui'
import {AlertCircle, Book} from '@tamagui/lucide-icons'
import {
  PropsWithChildren,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react'
import {HMAccount, HMGroup} from './json-hm'
import './publication-content.css'

export type EntityComponentsRecord = {
  AccountCard: React.FC<EntityComponentProps>
  GroupCard: React.FC<EntityComponentProps>
  PublicationCard: React.FC<EntityComponentProps>
}

export type PublicationContentContextValue = {
  entityComponents: EntityComponentsRecord
  onLinkClick: (dest: string, e: any) => void
  ipfsBlobPrefix: string
  saveCidAsFile: (cid: string, name: string) => Promise<void>
  citations?: Array<MttLink>
  onCitationClick?: () => void
  disableEmbedClick?: boolean
  onCopyBlock: (blockId: string) => void
}

export const publicationContentContext =
  createContext<PublicationContentContextValue | null>(null)

export type EntityComponentProps = BlockContentProps &
  ReturnType<typeof unpackHmId>

export function PublicationContentProvider({
  children,
  ...PubContentContext
}: PropsWithChildren<PublicationContentContextValue>) {
  return (
    <publicationContentContext.Provider value={PubContentContext}>
      {children}
    </publicationContentContext.Provider>
  )
}

export function usePublicationContentContext() {
  let context = useContext(publicationContentContext)

  if (!context) {
    throw new Error(
      `Please wrap <PublicationContent /> with <PublicationContentProvider />`,
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

export function PublicationContent({
  publication,
}: {
  publication: Publication | HMPublication
}) {
  return (
    <XStack paddingHorizontal="$3" $gtMd={{paddingHorizontal: '$4'}}>
      <BlockNodeList childrenType={'group'}>
        {publication.document?.children?.length &&
          publication.document?.children?.map((bn, idx) => (
            <BlockNodeContent
              key={bn.block?.id}
              blockNode={bn}
              depth={1}
              childrenType="group"
              index={idx}
            />
          ))}
      </BlockNodeList>
    </XStack>
  )
}

export function BlockNodeList({
  children,
  childrenType = 'group',
  start,
  ...props
}: YStackProps & {
  childrenType?: HMBlockChildrenType
  start?: any
}) {
  return (
    <YStack className="blocknode-list" {...props} width="100%">
      {children}
    </YStack>
  )
}

function BlockNodeMarker({
  block,
  childrenType,
  index = 0,
  start,
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
            marginTop: 3,
            fontSize: '$1',
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
      width={24}
      height={24}
      alignItems="center"
      justifyContent="flex-start"
      // borderWidth={1}
      // borderColor="$color5"
    >
      <Text {...styles} fontFamily="$body" userSelect="none" opacity={0.7}>
        {marker}
      </Text>
    </XStack>
  )
}

export function BlockNodeContent({
  blockNode,
  depth = 1,
  childrenType = 'group',
  ...props
}: {
  blockNode: BlockNode | HMBlockNode
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
  const {citations} = useBlockCitations(blockNode.block?.id)

  console.log(`== ~ citations:`, citations)
  const {onCitationClick, onCopyBlock} = usePublicationContentContext()

  let bnChildren = blockNode.children?.length
    ? blockNode.children.map((bn, index) => (
        <BlockNodeContent
          key={bn.block!.id}
          depth={depth + 1}
          blockNode={bn}
          childrenType={blockNode.block!.attributes?.childrenType}
          start={blockNode.block?.attributes?.start}
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

  const isEmbed = blockNode.block?.type == 'embed'

  return (
    <YStack
      borderRadius="$3"
      // overflow="hidden"
      // marginLeft={!props.embedDepth ? '1.5em' : undefined}
      onHoverIn={() => (props.embedDepth ? undefined : setIsHovering(true))}
      onHoverOut={() => (props.embedDepth ? undefined : setIsHovering(false))}
      // backgroundColor={
      //   props.embedDepth
      //     ? 'transparent'
      //     : isHovering
      //     ? '$color6'
      //     : 'transparent'
      // }
      className="blocknode-content"
    >
      <XStack
        padding={isEmbed ? 0 : '$2'}
        // paddingVertical={isEmbed ? 0 : '$3'}
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
        <BlockContent block={blockNode.block!} depth={depth} />
        {!props.embedDepth ? (
          <XStack
            paddingHorizontal="$2"
            position="absolute"
            top="$1"
            right={-24}
            padding="$2"
            borderRadius="$2"
          >
            {citations?.length ? (
              <Button
                size="$1"
                padding="$2"
                borderRadius="$2"
                chromeless
                onPress={() => onCitationClick?.()}
              >
                <Text color="$blue11" fontWeight="700">
                  {citations.length}
                </Text>
              </Button>
            ) : null}
            <Button
              opacity={isHovering ? 1 : 0}
              size="$1"
              padding="$2"
              borderRadius="$2"
              chromeless
              icon={Copy}
              onPress={() => {
                if (blockNode.block?.id) {
                  onCopyBlock(blockNode.block.id)
                } else {
                  console.error('onCopyBlock Error: no blockId available')
                }
              }}
            />
          </XStack>
        ) : null}
      </XStack>
      {bnChildren ? (
        <BlockNodeList
          onHoverIn={() =>
            props.embedDepth ? undefined : setIsHovering(false)
          }
          onHoverOut={() =>
            props.embedDepth ? undefined : setIsHovering(true)
          }
          childrenType={childrenType as HMBlockChildrenType}
          start={props.start}
          display="block"
        >
          {bnChildren}
        </BlockNodeList>
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
  className: 'content-inline',
  fontFamily: '$editorBody',
  fontSize: '$4',
  $gtMd: {
    size: '$4',
  },
  $gtLg: {
    size: '$5',
  },
}

export type BlockContentProps = {
  block: Block | HMBlock
  depth: number
}

function BlockContent(props: BlockContentProps) {
  if (props.block.type == 'paragraph') {
    return <BlockContentParagraph {...props} depth={props.depth || 1} />
  }

  if (props.block.type == 'heading') {
    return <BlockContentHeading {...props} depth={props.depth || 1} />
  }

  if (props.block.type == 'image') {
    return <BlockContentImage {...props} depth={props.depth || 1} />
  }

  if (props.block.type == 'video') {
    return <BlockContentVideo {...props} depth={props.depth} />
  }

  if (props.block.type == 'file') {
    return <BlockContentFile block={props.block} />
  }

  if (props.block.type == 'embed') {
    return <BlockContentEmbed {...props} depth={props.depth} />
  }

  return <BlockContentUnknown {...props} />
}

function BlockContentParagraph({block, depth}: BlockContentProps) {
  let inline = useMemo(() => toHMInlineContent(new Block(block)), [block])

  return (
    <YStack {...blockStyles} className="block-static block-paragraph">
      <Text {...inlineContentProps}>
        <InlineContentView inline={inline} />
      </Text>
    </YStack>
  )
}

function BlockContentHeading({block, depth}: BlockContentProps) {
  let inline = useMemo(() => toHMInlineContent(new Block(block)), [block])
  let headingTextStyles = useHeadingTextStyles(depth)
  let tag = `h${depth}`

  return (
    <YStack {...blockStyles} className="block-content block-heading">
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
        ...headingFontValues(24),
        $gtMd: headingFontValues(28),
        $gtLg: headingFontValues(32),
      } satisfies TextProps
    }

    if (depth == 2) {
      return {
        ...headingFontValues(20),
        $gtMd: headingFontValues(22),
        $gtLg: headingFontValues(24),
      } satisfies TextProps
    }

    if (depth == 3) {
      return {
        ...headingFontValues(16),
        $gtMd: headingFontValues(18),
        $gtLg: headingFontValues(20),
      } satisfies TextProps
    }

    return {
      ...headingFontValues(16),
      $gtMd: headingFontValues(18),
      $gtLg: headingFontValues(20),
    } satisfies TextProps
  }, [depth])
}

function useHeadingMarginStyles(depth: number) {
  function headingFontValues(value: number) {
    let realValue = value
    return {
      marginTop: realValue,
      // marginBottom: realValue / 3,
    }
  }

  return useMemo(() => {
    if (depth == 1) {
      return {
        ...headingFontValues(16),
        $gtMd: headingFontValues(18),
        $gtLg: headingFontValues(20),
      } satisfies TextProps
    }

    if (depth == 2) {
      return {
        ...headingFontValues(12),
        $gtMd: headingFontValues(14),
        $gtLg: headingFontValues(16),
      } satisfies TextProps
    }

    if (depth == 3) {
      return {
        ...headingFontValues(8),
        $gtMd: headingFontValues(10),
        $gtLg: headingFontValues(12),
      } satisfies TextProps
    }

    return {
      ...headingFontValues(8),
      $gtMd: headingFontValues(10),
      $gtLg: headingFontValues(12),
    } satisfies TextProps
  }, [depth])
}

function BlockContentImage({block, depth}: BlockContentProps) {
  let inline = useMemo(() => toHMInlineContent(new Block(block)), [block])
  const cid = getCIDFromIPFSUrl(block?.ref)
  const {ipfsBlobPrefix} = usePublicationContentContext()
  if (!cid) return null

  return (
    <YStack
      {...blockStyles}
      className="block-static block-image"
      paddingVertical="$3"
      gap="$2"
    >
      <img alt={block.attributes.alt} src={`${ipfsBlobPrefix}${cid}`} />
      {inline.length ? (
        <Text opacity={0.7} size="$2">
          <InlineContentView inline={inline} />
        </Text>
      ) : null}
    </YStack>
  )
}

function BlockContentVideo({block, depth}: BlockContentProps) {
  let inline = useMemo(() => toHMInlineContent(new Block(block)), [])
  const ref = block.ref || ''
  const {ipfsBlobPrefix} = usePublicationContentContext()

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
              src={`${ipfsBlobPrefix}${getCIDFromIPFSUrl(block.ref)}`}
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
        <Text>Video block wrong state</Text>
      )}
      {inline.length ? (
        <Text opacity={0.7} size="$2">
          <InlineContentView inline={inline} />
        </Text>
      ) : null}
    </YStack>
  )
}

type LinkType = null | 'basic' | 'hypermedia'

function hmTextColor(linkType: LinkType): string {
  if (linkType === 'basic') return '$color11'
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
  const {onLinkClick} = usePublicationContentContext()
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
              target={isHmLink ? undefined : '_blank'}
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

export function BlockContentEmbed(props: BlockContentProps) {
  const EmbedTypes = usePublicationContentContext().entityComponents
  if (props.block.type !== 'embed')
    throw new Error('BlockContentEmbed requires an embed block type')
  const id = unpackHmId(props.block.ref)
  if (id?.type == 'a') {
    return <EmbedTypes.AccountCard {...props} {...id} />
  }
  if (id?.type == 'g') {
    return <EmbedTypes.GroupCard {...props} {...id} />
  }
  if (id?.type == 'd') {
    return <EmbedTypes.PublicationCard {...props} {...id} />
  }
  return <BlockContentUnknown {...props} />
}

export function EmbedContentGroup({group}: {group: HMGroup}) {
  return (
    <XStack gap="$3" padding="$4" alignItems="flex-start">
      <XStack paddingVertical="$3">
        <Book size={36} />
      </XStack>
      <YStack justifyContent="center" flex={1}>
        <Text size="$1" opacity={0.5} flex={0}>
          Group
        </Text>
        <YStack gap="$2">
          <Text size="$6" fontWeight="bold">
            {group?.title}
          </Text>
          <Text size="$2">{group?.description}</Text>
        </YStack>
      </YStack>
    </XStack>
  )
}

export function EmbedContentAccount({account}: {account: HMAccount}) {
  const {ipfsBlobPrefix} = usePublicationContentContext()
  return (
    <XStack gap="$3" padding="$4" alignItems="flex-start">
      <XStack paddingVertical="$3">
        <UIAvatar
          id={account.id}
          size={36}
          label={account.profile?.alias}
          url={`${ipfsBlobPrefix}${account.profile?.avatar}`}
        />
      </XStack>
      <YStack justifyContent="center" flex={1}>
        <Text size="$1" opacity={0.5} flex={0}>
          Account
        </Text>
        <YStack gap="$2">
          <Text size="$6" fontWeight="bold">
            {account?.profile?.alias}
          </Text>
          <Text size="$2">{account.profile?.bio}</Text>
        </YStack>
      </YStack>
    </XStack>
  )
}

export function ErrorBlock({
  message,
  debugData,
}: {
  message: string
  debugData?: any
}) {
  return (
    <YStack
      // @ts-ignore
      contentEditable={false}
      userSelect="none"
      backgroundColor="$red5"
      borderColor="$red8"
      borderWidth={1}
      padding="$4"
      paddingVertical="$2"
      borderRadius="$4"
      gap="$2"
    >
      <XStack gap="$2">
        <AlertCircle size={18} color="$red10" />
        <Text fontFamily="$body">{message}</Text>
      </XStack>
      {debugData ? (
        <pre>
          <code>{JSON.stringify(debugData, null, 3)}</code>
        </pre>
      ) : null}
    </YStack>
  )
}

export function BlockContentUnknown(props: BlockContentProps) {
  let message = 'Unrecognized Block'
  if (props.block.type == 'embed') {
    message = `Unrecognized Embed: ${props.block.ref}`
  }
  return <ErrorBlock message={message} debugData={props.block} />
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

export function BlockContentFile({block}: {block: HMBlockFile}) {
  const {saveCidAsFile} = usePublicationContentContext()
  return (
    <YStack
      backgroundColor="$color3"
      borderColor="$color4"
      borderWidth={1}
      borderRadius={blockBorderRadius as any}
      overflow="hidden"
    >
      <XStack
        borderWidth={0}
        outlineWidth={0}
        padding="$4"
        alignItems="center"
        space
      >
        <File size={18} />

        <Text
          size="$5"
          maxWidth="17em"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          userSelect="text"
        >
          {block.attributes.name}
        </Text>
        {block.attributes.size && (
          <Text paddingTop="$1" color="$color10" size="$2" minWidth="4.5em">
            {formatBytes(parseInt(block.attributes.size))}
          </Text>
        )}
        <Tooltip content={`Download ${block.attributes.name}`}>
          <Button
            onPress={() => {
              saveCidAsFile(getCIDFromIPFSUrl(block.ref), block.attributes.name)
            }}
          >
            Download
          </Button>
        </Tooltip>
      </XStack>
    </YStack>
  )
}

function getSourceType(name?: string) {
  if (!name) return
  const nameArray = name.split('.')
  return `video/${nameArray[nameArray.length - 1]}`
}

export function useBlockCitations(blockId?: string) {
  const context = usePublicationContentContext()
  let citations = useMemo(() => {
    if (!context.citations?.length) return []
    return context.citations.filter((link) => {
      return link.target?.blockId == blockId
    })
  }, [blockId, context.citations])

  return {
    citations,
  }
}
