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
  IS_PROD_DESKTOP,
  HMBlockCodeBlock,
} from '@mintter/shared'
import {
  Button,
  ColorProp,
  Copy,
  File,
  Check as CheckIcon,
  Checkbox,
  CheckboxProps,
  SizableText,
  SizableTextProps,
  Text,
  TextProps,
  Label,
  Tooltip,
  UIAvatar,
  RadioGroup,
  SizeTokens,
  XStack,
  YStack,
  YStackProps,
  XStackProps,
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
import {
  contentLayoutUnit,
  contentTextUnit,
} from './publication-content-constants'

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
  onCopyBlock: null | ((blockId: string) => void)
  layoutUnit: number
  debug: boolean
  ffSerif?: boolean
}

export const publicationContentContext =
  createContext<PublicationContentContextValue | null>(null)

export type EntityComponentProps = BlockContentProps &
  ReturnType<typeof unpackHmId>

export function PublicationContentProvider({
  children,
  debugTop = 0,
  isDev = false,
  ...PubContentContext
}: PropsWithChildren<
  PublicationContentContextValue & {
    debugTop?: number
    isDev?: boolean
    ffSerif?: boolean
  }
>) {
  const [tUnit, setTUnit] = useState(contentTextUnit)
  const [lUnit, setLUnit] = useState(contentLayoutUnit)
  const [debug, setDebug] = useState(false)
  const [ffSerif, toggleSerif] = useState(true)
  return (
    <publicationContentContext.Provider
      value={{
        ...PubContentContext,
        layoutUnit: lUnit,
        textUnit: tUnit,
        debug,
        ffSerif,
      }}
    >
      {false ? (
        <YStack
          zIndex={100}
          padding="$2"
          // @ts-ignore
          position="fixed"
          borderColor="$color7"
          borderWidth={1}
          top={16}
          right={16}
          backgroundColor="$backgroundHover"
        >
          <CheckboxWithLabel
            label="debug"
            checked={debug}
            // @ts-ignore
            onCheckedChange={setDebug}
            size="$1"
          />
          <CheckboxWithLabel
            label="body sans-serif"
            checked={ffSerif}
            // @ts-ignore
            onCheckedChange={toggleSerif}
            size="$1"
          />
          <RadioGroup
            aria-labelledby="text unit"
            defaultValue="18"
            name="form"
            onValueChange={(val) => setTUnit(Number(val))}
          >
            <XStack gap="$2">
              <SizableText size="$1">Text unit:</SizableText>
              <RadioGroupItemWithLabel value="14" label="14" />
              <RadioGroupItemWithLabel value="16" label="16" />
              <RadioGroupItemWithLabel value="18" label="18" />
              <RadioGroupItemWithLabel value="20" label="20" />
              <RadioGroupItemWithLabel value="24" label="24" />
            </XStack>
          </RadioGroup>
          <RadioGroup
            aria-labelledby="layout unit"
            defaultValue="24"
            name="form"
            onValueChange={(val) => setLUnit(Number(val))}
          >
            <XStack gap="$2">
              <SizableText size="$1">Layout unit:</SizableText>
              <RadioGroupItemWithLabel value="16" label="16" />
              <RadioGroupItemWithLabel value="20" label="20" />
              <RadioGroupItemWithLabel value="24" label="24" />
              <RadioGroupItemWithLabel value="28" label="28" />
              <RadioGroupItemWithLabel value="32" label="32" />
            </XStack>
          </RadioGroup>
        </YStack>
      ) : null}
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

function debugStyles(debug: boolean = false, color: ColorProp = '$color7') {
  return debug
    ? {
        borderWidth: 1,
        borderColor: color,
      }
    : {}
}

export function PublicationContent({
  publication,
  ...props
}: XStackProps & {
  publication: Publication | HMPublication
}) {
  const {layoutUnit} = usePublicationContentContext()
  const allBlocks = publication.document?.children || []
  const hideTopBlock = // to avoid thrashing existing content, we hide the top block if it is effectively the same as the doc title
    !!publication.document?.title &&
    allBlocks[0]?.block?.type == 'heading' &&
    (!allBlocks[0]?.children || allBlocks[0]?.children?.length == 0) &&
    allBlocks[0]?.block?.text &&
    allBlocks[0]?.block?.text === publication.document?.title
  const displayBlocks = hideTopBlock ? allBlocks.slice(1) : allBlocks
  return (
    <XStack
      paddingHorizontal={layoutUnit / 2}
      $gtMd={{paddingHorizontal: layoutUnit}}
      {...props}
    >
      <BlockNodeList childrenType={'group'}>
        {displayBlocks?.length &&
          displayBlocks?.map((bn, idx) => (
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
  const {layoutUnit, textUnit, debug} = usePublicationContentContext()
  let styles = useMemo(
    () =>
      childrenType == 'ol'
        ? ({
            position: 'absolute',
            right: layoutUnit / 4,
            marginTop: layoutUnit / 7,
            fontSize: textUnit * 0.7,
          } satisfies SizableTextProps)
        : {},
    [childrenType, textUnit],
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
      width={layoutUnit}
      height={textUnit * 1.5}
      alignItems="center"
      justifyContent="flex-start"
      {...debugStyles(debug, 'green')}
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
  depth?: number
  start?: string | number
  childrenType?: HMBlockChildrenType | string
  embedDepth?: number
}) {
  const {layoutUnit} = usePublicationContentContext()
  const headingMarginStyles = useHeadingMarginStyles(depth, layoutUnit)
  const [isHovering, setIsHovering] = useState(false)
  const {citations} = useBlockCitations(blockNode.block?.id)

  const {onCitationClick, onCopyBlock, debug} = usePublicationContentContext()

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
      className="blocknode-content"
      borderRadius={layoutUnit / 4}
      onHoverIn={() => (props.embedDepth ? undefined : setIsHovering(true))}
      onHoverOut={() => (props.embedDepth ? undefined : setIsHovering(false))}
    >
      <XStack
        padding={isEmbed ? 0 : layoutUnit / 3}
        alignItems="baseline"
        {...headingStyles}
        {...debugStyles(debug, 'red')}
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
            position="absolute"
            top={layoutUnit / 4}
            right={0}
            backgroundColor={isHovering ? '$background' : 'transparent'}
            borderRadius={layoutUnit / 4}
            // flexDirection="row-reverse"
            $gtMd={{
              right: isEmbed ? layoutUnit * -2.5 : layoutUnit * -2,
            }}
          >
            {citations?.length ? (
              <Button
                size="$1"
                padding="$2"
                borderRadius="$2"
                chromeless
                onPress={() => onCitationClick?.()}
              >
                <SizableText color="$blue11" size="$1">
                  {citations.length}
                </SizableText>
              </Button>
            ) : null}

            {onCopyBlock ? (
              <Tooltip content="Copy block reference" delay={800}>
                <Button
                  size="$1"
                  opacity={isHovering ? 1 : 0}
                  padding={layoutUnit / 4}
                  borderRadius={layoutUnit / 4}
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
              </Tooltip>
            ) : null}
          </XStack>
        ) : null}
      </XStack>
      {bnChildren ? (
        <BlockNodeList
          paddingLeft={layoutUnit}
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
}

function inlineContentSize(unit: number): TextProps {
  return {
    fontSize: unit,
    lineHeight: unit * 1.3,
    $gtMd: {
      fontSize: unit * 1.1,
    },
    $gtLg: {
      fontSize: unit * 1.2,
    },
  }
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

  if (props.block.type == 'codeBlock') {
    return <BlockContentCode block={props.block} />
  }

  return <BlockContentUnknown {...props} />
}

function BlockContentParagraph({block, depth}: BlockContentProps) {
  const {debug, textUnit, ffSerif} = usePublicationContentContext()
  let inline = useMemo(() => toHMInlineContent(new Block(block)), [block])

  return (
    <YStack
      {...blockStyles}
      {...debugStyles(debug, 'blue')}
      className="block-static block-paragraph"
    >
      <Text
        className="content-inline"
        fontFamily={ffSerif ? '$editorBody' : '$body'}
        {...inlineContentSize(textUnit)}
      >
        <InlineContentView inline={inline} />
      </Text>
    </YStack>
  )
}

function BlockContentHeading({block, depth}: BlockContentProps) {
  const {textUnit, debug, ffSerif} = usePublicationContentContext()
  let inline = useMemo(() => toHMInlineContent(new Block(block)), [block])
  let headingTextStyles = useHeadingTextStyles(depth, textUnit)
  let tag = `h${depth}`

  return (
    <YStack
      {...blockStyles}
      {...debugStyles(debug, 'blue')}
      className="block-content block-heading"
    >
      <Text
        className="content-inline"
        fontFamily={ffSerif ? '$editorBody' : '$body'}
        tag={tag}
        {...headingTextStyles}
        maxWidth="95%"
      >
        <InlineContentView
          inline={inline}
          fontWeight="bold"
          fontFamily="$heading"
          {...headingTextStyles}
        />
      </Text>
    </YStack>
  )
}

function useHeadingTextStyles(depth: number, unit: number) {
  function headingFontValues(value: number) {
    return {
      fontSize: value,
      lineHeight: value * 1.2,
    }
  }

  return useMemo(() => {
    if (depth == 1) {
      return {
        ...headingFontValues(unit * 1.6),
        $gtMd: headingFontValues(unit * 1.7),
        $gtLg: headingFontValues(unit * 1.8),
      } satisfies TextProps
    }

    if (depth == 2) {
      return {
        ...headingFontValues(unit * 1.4),
        $gtMd: headingFontValues(unit * 1.5),
        $gtLg: headingFontValues(unit * 1.6),
      } satisfies TextProps
    }

    if (depth == 3) {
      return {
        ...headingFontValues(unit * 1.2),
        $gtMd: headingFontValues(unit * 1.3),
        $gtLg: headingFontValues(unit * 1.4),
      } satisfies TextProps
    }

    return {
      ...headingFontValues(unit),
      $gtMd: headingFontValues(unit * 1.1),
      $gtLg: headingFontValues(unit * 1.2),
    } satisfies TextProps
  }, [depth, unit])
}

function useHeadingMarginStyles(depth: number, unit: number) {
  function headingFontValues(value: number) {
    return {
      marginTop: value,
    }
  }

  return useMemo(() => {
    if (depth == 1) {
      return {
        ...headingFontValues(unit * 1.3),
        $gtMd: headingFontValues(unit * 1.4),
        $gtLg: headingFontValues(unit * 1.5),
      } satisfies TextProps
    }

    if (depth == 2) {
      return {
        ...headingFontValues(unit * 1.2),
        $gtMd: headingFontValues(unit * 1.25),
        $gtLg: headingFontValues(unit * 1.3),
      } satisfies TextProps
    }

    if (depth == 3) {
      return {
        ...headingFontValues(unit * 1),
        $gtMd: headingFontValues(unit * 1.15),
        $gtLg: headingFontValues(unit * 1.2),
      } satisfies TextProps
    }

    return {
      ...headingFontValues(unit),
      $gtMd: headingFontValues(unit),
      $gtLg: headingFontValues(unit),
    } satisfies TextProps
  }, [depth, unit])
}

function BlockContentImage({block, depth}: BlockContentProps) {
  let inline = useMemo(() => toHMInlineContent(new Block(block)), [block])
  const cid = getCIDFromIPFSUrl(block?.ref)
  const {ipfsBlobPrefix, textUnit} = usePublicationContentContext()
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
        <Text opacity={0.7} fontFamily="$body">
          <InlineContentView inline={inline} fontSize={textUnit * 0.85} />
        </Text>
      ) : null}
    </YStack>
  )
}

function BlockContentVideo({block, depth}: BlockContentProps) {
  let inline = useMemo(() => toHMInlineContent(new Block(block)), [])
  const ref = block.ref || ''
  const {ipfsBlobPrefix, textUnit} = usePublicationContentContext()

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
            <SizableText>Something is wrong with the video file.</SizableText>
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
        <Text opacity={0.7}>
          <InlineContentView fontSize={textUnit * 0.85} inline={inline} />
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
  fontSize,
  ...props
}: SizableTextProps & {
  inline: HMInlineContent[]
  linkType?: LinkType
  fontSize?: number
}) {
  const {onLinkClick, textUnit} = usePublicationContentContext()

  const fSize = fontSize || textUnit
  return (
    <Text fontSize={fSize} lineHeight={fSize * 1.5} {...props}>
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
            children = (
              <Text fontWeight="bold" fontSize={fSize} lineHeight={fSize * 1.5}>
                {children}
              </Text>
            )
          }

          if (content.styles.italic) {
            children = (
              <Text
                fontStyle="italic"
                fontSize={fSize}
                lineHeight={fSize * 1.5}
              >
                {children}
              </Text>
            )
          }

          if (content.styles.code) {
            children = (
              <Text
                backgroundColor="$backgroundFocus"
                // bg="red"
                fontFamily="$mono"
                tag="code"
                borderRadius="$2"
                overflow="hidden"
                fontSize={fSize * 0.85}
                lineHeight={fSize * 1.5}
                paddingHorizontal="$2"
                paddingVertical={2}
              >
                {children}
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

          // if (content.styles.strike) {
          //   children = <s>{children}</s>
          // }

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
              fontSize={fSize}
              lineHeight={fSize * 1.5}
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
              className={isHmLink ? 'hm-link' : 'link'}
              key={index}
              target={isHmLink ? undefined : '_blank'}
              onClick={(e) => onLinkClick(content.href, e)}
            >
              <InlineContentView
                fontSize={fSize}
                lineHeight={fSize * 1.5}
                inline={content.content}
                linkType={isHmLink ? 'hypermedia' : 'basic'}
              />
            </a>
          )
        }
        return null
      })}
    </Text>
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
        <SizableText size="$1" opacity={0.5} flex={0}>
          Account
        </SizableText>
        <YStack gap="$2">
          <SizableText size="$6" fontWeight="bold">
            {account?.profile?.alias}
          </SizableText>
          <SizableText size="$2">{account.profile?.bio}</SizableText>
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
  const {layoutUnit, saveCidAsFile} = usePublicationContentContext()
  return (
    <YStack
      // backgroundColor="$color3"
      borderColor="$color6"
      borderWidth={1}
      borderRadius={layoutUnit / 4}
      padding={layoutUnit / 2}
      overflow="hidden"
      width="100%"
      hoverStyle={{
        backgroundColor: '$backgroundHover',
      }}
      group="fileblock"
    >
      <XStack
        borderWidth={0}
        outlineWidth={0}
        alignItems="center"
        space
        flex={1}
      >
        <File size={18} />

        <SizableText
          size="$5"
          maxWidth="17em"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          userSelect="text"
          flex={1}
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
        <XStack flex={1} />
        <Tooltip content={`Download ${block.attributes.name}`}>
          <Button
            opacity={0}
            $group-fileblock-hover={{
              opacity: 1,
            }}
            size="$2"
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

export function BlockContentCode({block}: {block: HMBlockCodeBlock}) {
  const {layoutUnit} = usePublicationContentContext()

  return (
    <YStack
      {...blockStyles}
      borderColor="$color6"
      borderWidth={1}
      borderRadius={layoutUnit / 4}
      className="block-static block-code"
      padding="$3"
      gap="$2"
      width="100%"
    >
      <pre>
        <code style={{fontFamily: 'monospace', whiteSpace: 'pre'}}>
          {block.text}
        </code>
      </pre>
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

function CheckboxWithLabel({
  size,
  label,
  ...checkboxProps
}: CheckboxProps & {size: SizeTokens; label: string}) {
  const id = `checkbox-${size.toString().slice(1)}`
  return (
    <XStack alignItems="center" space="$2">
      <Checkbox id={id} size={size} {...checkboxProps}>
        <Checkbox.Indicator>
          <CheckIcon />
        </Checkbox.Indicator>
      </Checkbox>

      <Label size={size} htmlFor={id}>
        {label}
      </Label>
    </XStack>
  )
}

function RadioGroupItemWithLabel(props: {value: string; label: string}) {
  const id = `radiogroup-${props.value}`
  return (
    <XStack alignItems="center" space="$2">
      <RadioGroup.Item value={props.value} id={id} size="$1">
        <RadioGroup.Indicator />
      </RadioGroup.Item>

      <Label size="$1" htmlFor={id}>
        {props.label}
      </Label>
    </XStack>
  )
}
