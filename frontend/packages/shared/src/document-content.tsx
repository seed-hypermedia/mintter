import { Timestamp } from '@bufbuild/protobuf'
import {
  API_HTTP_URL,
  Block,
  BlockNode,
  BlockRange,
  ExpandedBlockRange,
  HMBlock,
  HMBlockChildrenType,
  HMBlockNode,
  HMDocument,
  HMInlineContent,
  Mention,
  UnpackedHypermediaId,
  clipContentBlocks,
  formatBytes,
  formattedDate,
  getCIDFromIPFSUrl,
  idToUrl,
  isHypermediaScheme,
  pluralS,
  toHMInlineContent,
  unpackHmId,
  useHover,
  useLowlight
} from '@shm/shared'
import {
  BlockQuote,
  Button,
  ButtonFrame,
  Check as CheckIcon,
  Checkbox,
  CheckboxProps,
  ChevronDown,
  Forward as ChevronRight,
  ColorProp,
  Comment,
  File,
  Label,
  Link,
  MoreHorizontal,
  MoveLeft,
  RadioGroup,
  SizableText,
  SizableTextProps,
  SizeTokens,
  Spinner,
  Text,
  TextProps,
  Theme,
  Tooltip,
  UIAvatar,
  Undo2,
  XPostNotFound,
  XPostSkeleton,
  XStack,
  XStackProps,
  YStack,
  YStackProps,
} from '@shm/ui'
import { AlertCircle, MessageSquare, Reply } from '@tamagui/lucide-icons'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { common } from 'lowlight'
import { nip19, nip21, validateEvent, verifySignature } from 'nostr-tools'
import {
  PropsWithChildren,
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { RiCheckFill, RiCloseCircleLine, RiRefreshLine } from 'react-icons/ri'
import {
  QuotedTweet,
  TweetBody,
  TweetHeader,
  TweetInReplyTo,
  TweetInfo,
  TweetMedia,
  enrichTweet,
  useTweet,
} from 'react-tweet'
import {
  contentLayoutUnit,
  contentTextUnit,
} from './document-content-constants'
import './document-content.css'
import { HMAccount } from './hm-types'
import { useRangeSelection } from './range-selection'

export type EntityComponentsRecord = {
  Account: React.FC<EntityComponentProps>
  Document: React.FC<EntityComponentProps>
  Comment: React.FC<EntityComponentProps>
  Inline: React.FC<InlineEmbedComponentProps>
}

export type DocContentContextValue = {
  entityComponents: EntityComponentsRecord
  onLinkClick: (dest: string, e: any) => void
  ipfsBlobPrefix: string
  saveCidAsFile: (cid: string, name: string) => Promise<void>
  citations?: Mention[]

  onCitationClick?: () => void
  disableEmbedClick?: boolean
  onCopyBlock:
  | null
  | ((blockId: string, blockRange?: BlockRange | ExpandedBlockRange) => void)
  onReplyBlock?: null | ((blockId: string) => void)
  onBlockComment?:
  | null
  | ((blockId: string, blockRange?: BlockRange | ExpandedBlockRange) => void)
  layoutUnit: number
  textUnit: number
  debug: boolean
  ffSerif?: boolean
  comment?: boolean
  renderOnly?: boolean
  routeParams?: {
    documentId?: string
    version?: string
    blockRef?: string
  }
  importWebFile?: any
}

export const docContentContext =
  createContext<DocContentContextValue | null>(null)

export type EntityComponentProps = BlockContentProps & UnpackedHypermediaId

export type InlineEmbedComponentProps = ReturnType<typeof unpackHmId>

export function DocContentProvider({
  children,
  debugTop = 0,
  showDevMenu = false,
  comment = false,
  renderOnly = false,
  routeParams = {},
  ...PubContentContext
}: PropsWithChildren<
  DocContentContextValue & {
    debugTop?: number
    showDevMenu?: boolean
    ffSerif?: boolean
  }
>) {
  const [tUnit, setTUnit] = useState(contentTextUnit)
  const [lUnit, setLUnit] = useState(contentLayoutUnit)
  const [debug, setDebug] = useState(false)
  const [ffSerif, toggleSerif] = useState(true)
  return (
    <docContentContext.Provider
      value={{
        ...PubContentContext,
        layoutUnit: lUnit,
        textUnit: comment ? tUnit * 0.9 : tUnit,
        debug,
        ffSerif,
        comment,
        renderOnly,
        routeParams,
      }}
    >
      {showDevMenu ? (
        <YStack
          zIndex={100}
          padding="$2"
          position="fixed"
          borderColor="$color7"
          borderWidth={1}
          bottom={16}
          right={16}
          backgroundColor="$backgroundHover"
        >
          <CheckboxWithLabel
            label="debug"
            checked={debug}
            // @ts-expect-error
            onCheckedChange={setDebug}
            size="$1"
          />
          <CheckboxWithLabel
            label="body sans-serif"
            checked={ffSerif}
            // @ts-expect-error
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
    </docContentContext.Provider>
  )
}

export function useDocContentContext() {
  let context = useContext(docContentContext)

  if (!context) {
    throw new Error(
      `Please wrap <DocContent /> with <DocContentProvider />`,
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

function getFocusedBlocks(blocks: HMBlockNode[], blockId?: string) {
  if (!blockId) return blocks
  const focused = getBlockNodeById(blocks, blockId)
  if (focused) return [focused]
  return null
}

export function DocContent({
  document,
  focusBlockId,
  maxBlockCount,
  marginVertical = '$5',
  ...props
}: XStackProps & {
  document: HMDocument
  focusBlockId?: string | undefined
  maxBlockCount?: number
  marginVertical?: any
}) {
  const { wrapper, bubble, coords, state, send } = useRangeSelection()

  const { layoutUnit, onCopyBlock, onBlockComment } =
    useDocContentContext()
  const allBlocks = document?.content || []
  const focusedBlocks = getFocusedBlocks(allBlocks, focusBlockId)
  const displayBlocks = maxBlockCount
    ? clipContentBlocks(focusedBlocks || [], maxBlockCount)
    : focusedBlocks

  useEffect(() => {
    function handleSelectAll(event: KeyboardEvent) {
      if (event.key == 'a' && event.metaKey) {
        event.preventDefault()
        if (wrapper.current) {
          window.getSelection()?.selectAllChildren(wrapper.current)
        }
      }
    }

    window.addEventListener('keydown', handleSelectAll)

    return () => {
      window.removeEventListener('keydown', handleSelectAll)
    }
  }, [])

  return (
    <YStack
      ref={wrapper}
      paddingHorizontal={layoutUnit / 3}
      $gtMd={{ paddingHorizontal: layoutUnit / 2 }}
      marginVertical={marginVertical}
      {...props}
    >
      <XStack
        ref={bubble}
        {...coords}
        zIndex={99999}
        position="absolute"
        elevation="$4"
        userSelect="none"
      >
        {onCopyBlock ? (
          <Tooltip content="Copy Block Range">
            <Button
              size="$2"
              icon={Link}
              onPress={() => {
                onCopyBlock(
                  state.context.blockId,
                  typeof state.context.rangeStart == 'number' &&
                    typeof state.context.rangeEnd == 'number'
                    ? {
                      start: state.context.rangeStart,
                      end: state.context.rangeEnd,
                    }
                    : {
                      expanded: true,
                    },
                )
              }}
            />
          </Tooltip>
        ) : null}
        {onBlockComment ? (
          <Tooltip content="Add a Comment">
            <Button
              size="$2"
              icon={Comment}
              onPress={() => {
                send({ type: 'CREATE_COMMENT' })
                onBlockComment(
                  state.context.blockId,
                  typeof state.context.rangeStart == 'number' &&
                    typeof state.context.rangeEnd == 'number'
                    ? {
                      start: state.context.rangeStart,
                      end: state.context.rangeEnd,
                    }
                    : undefined,
                )
              }}
            />
          </Tooltip>
        ) : null}
      </XStack>
      <BlocksContent blocks={displayBlocks} parentBlockId={null} />
    </YStack>
  )
}

export function BlocksContent({
  blocks,
  parentBlockId,
}: {
  blocks?: HMBlockNode[] | null
  parentBlockId: string | null
}) {
  if (!blocks) return null
  return (
    <BlockNodeList childrenType={'group'}>
      {blocks?.length &&
        blocks?.map((bn, idx) => (
          <BlockNodeContent
            parentBlockId={parentBlockId}
            isFirstChild={idx == 0}
            key={bn.block?.id}
            blockNode={bn}
            depth={1}
            childrenType={bn.block.attributes?.childrenType}
            start={bn.block.attributes?.start}
            listLevel={bn.block.attributes?.listLevel}
            index={idx}
          />
        ))}
    </BlockNodeList>
  )
}

export function BlockNodeList({
  children,
  childrenType = 'group',
  start,
  listLevel,
  ...props
}: YStackProps & {
  childrenType?: HMBlockChildrenType
  start?: string | number
  listLevel?: string | number
}) {
  return (
    <YStack
      tag={childrenType !== 'group' ? childrenType : undefined}
      start={start}
      className="blocknode-list"
      data-node-type="blockGroup"
      data-list-type={childrenType !== 'group' ? childrenType : undefined}
      data-list-level={listLevel}
      {...props}
      width="100%"
    >
      {children}
    </YStack>
  )
}

// function BlockNodeMarker({
//   block,
//   childrenType,
//   index = 0,
//   start = '1',
// }: {
//   block: Block
//   childrenType?: string
//   start?: string
//   index?: number
//   headingTextStyles: TextProps
// }) {
//   const {layoutUnit, textUnit, debug} = useDocContentContext()
//   let styles = useMemo(
//     () =>
//       childrenType == 'ol'
//         ? ({
//             position: 'absolute',
//             right: layoutUnit / 4,
//             marginTop: layoutUnit / 7,
//             fontSize: textUnit * 0.7,
//           } satisfies SizableTextProps)
//         : {},
//     [childrenType, textUnit, layoutUnit],
//   )
//   let marker

//   if (childrenType == 'ol') {
//     marker = `${index + Number(start)}.`
//   }

//   if (childrenType == 'ul') {
//     marker = '•'
//   }

//   if (!marker) return null

//   return (
//     <XStack
//       flex={0}
//       width={layoutUnit}
//       height={textUnit * 1.5}
//       alignItems="center"
//       justifyContent="flex-start"
//       {...debugStyles(debug, 'green')}
//     >
//       <Text {...styles} fontFamily="$body" userSelect="none" opacity={0.7}>
//         {marker}
//       </Text>
//     </XStack>
//   )
// }

export function BlockNodeContent({
  blockNode,
  depth = 1,
  start,
  listLevel,
  childrenType = 'group',
  isFirstChild = false,
  expanded = true,
  embedDepth = 1,
  parentBlockId,
  ...props
}: {
  isFirstChild: boolean
  blockNode: BlockNode | HMBlockNode
  index: number
  depth?: number
  start?: string | number
  listLevel?: string
  childrenType?: HMBlockChildrenType | string
  embedDepth?: number
  expanded?: boolean
  parentBlockId: string | null
}) {
  const {
    layoutUnit,
    textUnit,
    renderOnly,
    routeParams,
    onCitationClick,
    onBlockComment,
    onCopyBlock,
    onReplyBlock,
    debug,
    comment,
  } = useDocContentContext()
  const headingMarginStyles = useHeadingMarginStyles(
    depth,
    layoutUnit,
    isFirstChild,
  )
  const { hover, ...hoverProps } = useHover()
  const { citations } = useBlockCitations(blockNode.block?.id)
  const [_expanded, setExpanded] = useState<boolean>(expanded)

  useEffect(() => {
    if (expanded !== _expanded) {
      setExpanded(expanded)
    }
  }, [expanded])

  const elm = useRef<HTMLDivElement>(null)
  let bnChildren = blockNode.children?.length
    ? blockNode.children.map((bn, index) => (
      <BlockNodeContent
        key={bn.block!.id}
        depth={depth + 1}
        isFirstChild={index == 0}
        blockNode={bn}
        childrenType={bn.block!.attributes?.childrenType}
        start={bn.block!.attributes?.start}
        listLevel={bn.block!.attributes?.listLevel}
        index={index}
        parentBlockId={blockNode.block?.id || null}
        embedDepth={embedDepth ? embedDepth + 1 : embedDepth}
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

  const interactiveProps = !renderOnly ? hoverProps : {}

  const [isHighlight, setHighlight] = useState(false)

  useEffect(() => {
    let val = routeParams?.blockRef == blockNode.block?.id && !comment
    if (val) {
      setTimeout(() => {
        setHighlight(false)
      }, 1000)
    }
    setHighlight(val)
  }, [routeParams?.blockRef, comment, blockNode.block])

  function handleBlockNodeToggle() {
    setExpanded(!_expanded)
  }

  useEffect(() => {
    if (elm.current && isHighlight) {
      elm.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isHighlight])

  const contentH = useMemo(() => {
    // this calculates the position the collapse button should be at, based on the height of the content
    // and the height of the heading
    if (elm.current) {
      const contentNode = elm.current.querySelector('.block-content')

      if (contentNode) {
        const rect = contentNode.getBoundingClientRect()

        return rect.height / 2 - (layoutUnit * 0.75) / 2
      } else {
        return 4
      }
    }
  }, [elm.current, blockNode.block])

  // @ts-expect-error
  if (isBlockNodeEmpty(blockNode)) {
    return null
  }

  return (
    <YStack
      ref={elm}
      className="blocknode-content"
      id={blockNode.block?.id}
      borderColor={isHighlight ? '$yellow5' : '$colorTransparent'}
      borderWidth={1}
      borderRadius={layoutUnit / 4}
      bg={isHighlight ? '$yellow3' : '$backgroundTransparent'}
      data-node-type="blockContainer"
    // onHoverIn={() => (props.embedDepth ? undefined : hoverProps.onHoverIn())}
    // onHoverOut={() =>
    //   props.embedDepth ? undefined : hoverProps.onHoverOut()
    // }
    >
      <XStack
        padding={isEmbed ? 0 : layoutUnit / 3}
        {...headingStyles}
        {...debugStyles(debug, 'red')}
        group="blocknode"
        className={
          blockNode.block!.type === 'heading' ? 'blocknode-content-heading' : ''
        }
      >
        {bnChildren ? (
          <Tooltip
            content={
              _expanded
                ? 'You can collapse this block and hide its children'
                : 'This block is collapsed. you can expand it and see its children'
            }
          >
            <Button
              size="$1"
              x={textUnit * -1}
              y={contentH}
              chromeless
              width={layoutUnit}
              height={layoutUnit * 0.75}
              icon={_expanded ? ChevronDown : ChevronRight}
              onPress={(e) => {
                e.stopPropagation()
                handleBlockNodeToggle()
              }}
              userSelect="none"
              position="absolute"
              zIndex="$5"
              left={0}
              bg="$backgroundTransparent"
              opacity={_expanded ? 0 : 1}
              hoverStyle={{
                opacity: 1,
              }}
              $group-blocknode-hover={{
                opacity: 1,
              }}
            />
          </Tooltip>
        ) : null}

        {/* <BlockNodeMarker
          block={blockNode.block!}
          childrenType={childrenType}
          index={props.index}
          start={props.start}
        /> */}
        <BlockContent
          block={blockNode.block!}
          depth={depth}
          parentBlockId={parentBlockId}
          {...interactiveProps}
        />
        {bnChildren && !_expanded ? (
          <Tooltip content="This block is collapsed. you can expand it and see its children">
            <Button
              userSelect="none"
              marginHorizontal={layoutUnit / 4}
              size="$1"
              alignSelf="center"
              icon={MoreHorizontal}
              onPress={(e) => {
                e.stopPropagation()
                handleBlockNodeToggle()
              }}
            />
          </Tooltip>
        ) : null}
        <XStack
          pl="$2"
          borderRadius={layoutUnit / 4}
          gap="$2"
          onHoverIn={() =>
            props.embedDepth ? undefined : hoverProps.onHoverIn()
          }
          onHoverOut={() =>
            props.embedDepth ? undefined : hoverProps.onHoverOut()
          }
        >
          {citations?.length ? (
            <Tooltip
              content={`See ${citations.length} ${pluralS(
                citations.length,
                'document',
              )} referencing this`}
              delay={800}
            >
              <Button
                userSelect="none"
                size="$2"
                chromeless
                padding={layoutUnit / 4}
                borderRadius={layoutUnit / 4}
                // theme="blue"
                onPress={() => onCitationClick?.()}
              >
                <XStack gap="$2" ai="center">
                  <BlockQuote size={layoutUnit / 2} color="$blue11" />
                  <SizableText color="$blue11" size="$2">
                    {String(citations.length)}
                  </SizableText>
                </XStack>
              </Button>
            </Tooltip>
          ) : null}
          {!props.embedDepth && !renderOnly ? (
            <>
              {onCopyBlock ? (
                <Tooltip content="Copy block reference" delay={800}>
                  <Button
                    userSelect="none"
                    size="$2"
                    opacity={hover ? 1 : 0}
                    padding={layoutUnit / 4}
                    borderRadius={layoutUnit / 4}
                    chromeless
                    icon={Link}
                    onPress={() => {
                      if (blockNode.block?.id) {
                        onCopyBlock(blockNode.block.id, { expanded: true })
                      } else {
                        console.error('onCopyBlock Error: no blockId available')
                      }
                    }}
                  />
                </Tooltip>
              ) : null}
              {onReplyBlock ? (
                <Tooltip content="Reply to block" delay={800}>
                  <Button
                    userSelect="none"
                    size="$2"
                    opacity={hover ? 1 : 0}
                    padding={layoutUnit / 4}
                    borderRadius={layoutUnit / 4}
                    chromeless
                    icon={Reply}
                    onPress={() => {
                      if (blockNode.block?.id) {
                        onReplyBlock(blockNode.block.id)
                      } else {
                        console.error(
                          'onReplyBlock Error: no blockId available',
                        )
                      }
                    }}
                  />
                </Tooltip>
              ) : null}
              {onBlockComment ? (
                <Tooltip content="Comment on this block" delay={800}>
                  <Button
                    userSelect="none"
                    size="$2"
                    opacity={hover ? 1 : 0}
                    padding={layoutUnit / 4}
                    borderRadius={layoutUnit / 4}
                    chromeless
                    icon={MessageSquare}
                    onPress={() => {
                      if (blockNode.block?.id) {
                        onBlockComment(blockNode.block.id)
                      } else {
                        console.error(
                          'onBlockComment Error: no blockId available',
                        )
                      }
                    }}
                  />
                </Tooltip>
              ) : null}
            </>
          ) : null}
        </XStack>
      </XStack>
      {bnChildren && _expanded ? (
        <BlockNodeList
          paddingLeft={blockNode.block?.type != 'heading' ? layoutUnit : 0}
          childrenType={childrenType as HMBlockChildrenType}
          start={start}
          listLevel={listLevel}
          display="block"
        >
          {bnChildren}
        </BlockNodeList>
      ) : null}
    </YStack>
  )
}

function isBlockNodeEmpty(bn: HMBlockNode): boolean {
  if (bn.children && bn.children.length) return false
  if (typeof bn.block == 'undefined') return true
  switch (bn.block.type) {
    case 'paragraph':
    case 'heading':
    case 'math':
    case 'equation':
    case 'code':
    case 'codeBlock':
      return !bn.block.text
    case 'image':
    case 'file':
    case 'video':
    case 'nostr':
    case 'embed':
    case 'web-embed':
      return !bn.block.ref
    default:
      return false
  }
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
  parentBlockId: string | null
  depth: number
  onHoverIn?: () => void
  onHoverOut?: () => void
}

function BlockContent(props: BlockContentProps) {
  const dataProps = {
    depth: props.depth || 1,
    'data-blockid': props.block.id,
  }
  if (props.block.type == 'paragraph') {
    return <BlockContentParagraph {...props} {...dataProps} />
  }

  if (props.block.type == 'heading') {
    return <BlockContentHeading {...props} {...dataProps} />
  }

  if (props.block.type == 'image') {
    return <BlockContentImage {...props} {...dataProps} />
  }

  if (props.block.type == 'video') {
    return <BlockContentVideo {...props} {...dataProps} />
  }

  if (props.block.type == 'file') {
    if (props.block.attributes.subType?.startsWith('nostr:')) {
      return <BlockContentNostr {...props} {...dataProps} />
    } else {
      return <BlockContentFile {...props} {...dataProps} />
    }
  }

  if (props.block.type == 'web-embed') {
    return <BlockContentXPost {...props} {...dataProps} />
  }

  if (props.block.type == 'embed') {
    return <BlockContentEmbed {...props} {...dataProps} />
  }

  if (props.block.type == 'codeBlock') {
    return <BlockContentCode {...props} {...dataProps} />
  }

  if (['equation', 'math'].includes(props.block.type)) {
    return <BlockContentMath {...props} block={props.block} />
  }

  return <BlockContentUnknown {...props} />
}

function BlockContentParagraph({
  block,
  parentBlockId,
  ...props
}: BlockContentProps) {
  const { debug, textUnit, comment } = useDocContentContext()

  let inline = useMemo(() => toHMInlineContent(new Block(block)), [block])
  return (
    <YStack
      {...blockStyles}
      {...props}
      {...debugStyles(debug, 'blue')}
      className="block-content block-paragraph"
    >
      <Text
        className={`content-inline ${comment ? 'is-comment' : ''}`}
        {...inlineContentSize(textUnit)}
      >
        <InlineContentView inline={inline} />
      </Text>
    </YStack>
  )
}

export function BlockContentHeading({
  block,
  depth,
  parentBlockId,
  ...props
}: BlockContentProps) {
  const { textUnit, debug, ffSerif } = useDocContentContext()
  let inline = useMemo(() => toHMInlineContent(new Block(block)), [block])
  let headingTextStyles = useHeadingTextStyles(depth, textUnit)
  let tag = `h${depth}`

  return (
    <YStack
      {...blockStyles}
      {...props}
      {...debugStyles(debug, 'blue')}
      className="block-content block-heading"
    >
      <Text
        className="content-inline"
        // fontFamily={ffSerif ? '$editorBody' : '$body'}
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

export function DocHeading({
  children,
  right,
}: {
  children?: string
  right?: React.ReactNode
}) {
  const { textUnit, debug, layoutUnit } = useDocContentContext()
  let headingTextStyles = useHeadingTextStyles(1, textUnit)
  let headingMarginStyles = useHeadingMarginStyles(1, layoutUnit)

  return (
    <Theme name="subtle">
      <YStack
        paddingHorizontal={layoutUnit / 3}
        $gtMd={{ paddingHorizontal: layoutUnit / 2 }}
        group="header"
      >
        <YStack
          padding={layoutUnit / 3}
          // marginBottom={layoutUnit}
          paddingBottom={layoutUnit / 2}
        // {...headingMarginStyles}
        >
          <XStack>
            <YStack {...blockStyles} {...debugStyles(debug, 'blue')}>
              <Text
                className="content-inline"
                fontFamily={'$body'}
                tag="h1"
                {...headingTextStyles}
                maxWidth="95%"
              >
                {children}
              </Text>
            </YStack>
            {right}
          </XStack>
        </YStack>
      </YStack>
    </Theme>
  )
}

export function useHeadingTextStyles(depth: number, unit: number) {
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

export function useHeadingMarginStyles(
  depth: number,
  unit: number,
  isFirst?: boolean,
) {
  function headingFontValues(value: number) {
    return {
      marginTop: value,
    }
  }

  return useMemo(() => {
    if (isFirst) {
      return {
        marginTop: 0,
      } satisfies TextProps
    } else {
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
    }
  }, [depth, unit])
}

function BlockContentImage({
  block,
  parentBlockId,
  ...props
}: BlockContentProps) {
  let inline = useMemo(() => toHMInlineContent(new Block(block)), [block])
  const cid = getCIDFromIPFSUrl(block?.ref)
  const { ipfsBlobPrefix, textUnit } = useDocContentContext()
  if (!cid) return null

  return (
    <YStack
      {...blockStyles}
      {...props}
      className="block-content block-image"
      data-content-type="image"
      data-url={`ipfs://${cid}`}
      data-alt={block?.attributes?.alt}
      data-width={block.attributes?.width}
      paddingVertical="$3"
      gap="$2"
      ai="center"
      width="100%"
    >
      <XStack
        width={
          block.attributes?.width ? `${block.attributes?.width}px` : undefined
        }
      >
        <img
          alt={block?.attributes?.alt}
          src={`${ipfsBlobPrefix}${cid}`}
          style={{ width: '100%' }}
        />
      </XStack>
      {inline.length ? (
        <Text opacity={0.7} fontFamily="$body">
          <InlineContentView inline={inline} fontSize={textUnit * 0.85} />
        </Text>
      ) : null}
    </YStack>
  )
}

function BlockContentVideo({
  block,
  parentBlockId,
  ...props
}: BlockContentProps) {
  let inline = useMemo(() => toHMInlineContent(new Block(block)), [])
  const ref = block.ref || ''
  const { ipfsBlobPrefix, textUnit } = useDocContentContext()

  return (
    <YStack
      {...blockStyles}
      {...props}
      className="block-content block-video"
      paddingVertical="$3"
      gap="$2"
      data-content-type="video"
      data-url={ref}
      data-name={block.attributes?.name}
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

function getInlineContentOffset(inline: HMInlineContent): number {
  if (inline.type === 'link') {
    return inline.content.map(getInlineContentOffset).reduce((a, b) => a + b, 0)
  }
  return inline.text?.length || 0
}

function InlineContentView({
  inline,
  style,
  linkType = null,
  fontSize,
  rangeOffset,
  isRange = false,
  ...props
}: SizableTextProps & {
  inline: HMInlineContent[]
  linkType?: LinkType
  fontSize?: number
  rangeOffset?: number
  isRange?: boolean
}) {
  const { onLinkClick, textUnit, entityComponents } =
    useDocContentContext()

  const InlineEmbed = entityComponents.Inline

  let contentOffset = rangeOffset || 0

  const fSize = fontSize || textUnit
  const rangeColor = '$yellow6'
  return (
    <Text
      fontSize={fSize}
      lineHeight={fSize * 1.5}
      data-range-offset={contentOffset}
      whiteSpace="pre-wrap"
      {...props}
    >
      {inline.map((content, index) => {
        const inlineContentOffset = contentOffset
        contentOffset += getInlineContentOffset(content)
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

          // TODO: fix this hack to render soft-line breaks
          let children: any = content.text.split('\n')

          if (children.length > 1) {
            children = children.map(
              (l: string, i: number, a: Array<string>) => {
                if (a.length == i - 1) {
                  return l
                } else {
                  return (
                    <>
                      {l}
                      <br />
                    </>
                  )
                }
              },
            )
          } else {
            children = content.text
          }

          if (content.styles.bold) {
            children = (
              <Text
                fontWeight="bold"
                fontSize={fSize}
                lineHeight={fSize * 1.5}
                data-range-offset={inlineContentOffset}
              >
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
                data-range-offset={inlineContentOffset}
              >
                {children}
              </Text>
            )
          }

          if (content.styles.code) {
            children = (
              <Text
                backgroundColor={isRange ? rangeColor : '$color4'}
                fontFamily="$mono"
                tag="code"
                borderRadius="$2"
                overflow="hidden"
                fontSize={fSize * 0.85}
                lineHeight={fSize * 1.5}
                paddingHorizontal="$2"
                paddingVertical={2}
                data-range-offset={inlineContentOffset}
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
              key={`${content.type}-${index}`}
              color={hmTextColor(linkType)}
              textDecorationColor={hmTextColor(linkType)}
              style={{ textDecorationLine }}
              fontSize={fSize}
              lineHeight={fSize * 1.5}
              data-range-offset={inlineContentOffset}
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
                rangeOffset={inlineContentOffset}
              />
            </a>
          )
        }

        if (content.type == 'inline-embed') {
          const unpackedRef = unpackHmId(content.ref)
          return <InlineEmbed key={content.ref} {...unpackedRef} />
        }

        if (content.type == 'range') {
          return (
            <Text backgroundColor={rangeColor}>
              <InlineContentView
                isRange
                fontSize={fSize}
                lineHeight={fSize * 1.5}
                inline={content.content}
                rangeOffset={inlineContentOffset}
              />
            </Text>
          )
        }
        return null
      })}
    </Text>
  )
}

export function BlockContentEmbed(props: BlockContentProps) {
  const EmbedTypes = useDocContentContext().entityComponents
  if (props.block.type !== 'embed')
    throw new Error('BlockContentEmbed requires an embed block type')
  const id = unpackHmId(props.block.ref)
  if (id?.type == 'a') {
    return <EmbedTypes.Account {...props} {...id} />
  }
  if (id?.type == 'd') {
    return <EmbedTypes.Document {...props} {...id} />
  }
  if (id?.type == 'c') {
    return <EmbedTypes.Comment {...props} {...id} />
  }
  return <BlockContentUnknown {...props} />
}


export function EmbedAccountContent({ account }: { account: HMAccount }) {
  const { ipfsBlobPrefix } = useDocContentContext()
  return (
    <XStack gap="$3" padding="$2" alignItems="flex-start">
      <XStack paddingVertical="$3">
        <UIAvatar
          id={account.id}
          size={40}
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
  let [open, toggleOpen] = useState(false)
  return (
    <Tooltip
      content={debugData ? (open ? 'Hide debug Data' : 'Show debug data') : ''}
    >
      <YStack f={1} className="block-content block-unknown">
        <ButtonFrame theme="red" gap="$2" onPress={() => toggleOpen((v) => !v)}>
          <SizableText flex={1} color="$red10">
            {message ? message : 'Error'}
          </SizableText>
          <AlertCircle color="$red10" size={12} />
        </ButtonFrame>
        {open ? (
          <XStack
            padding="$2"
            borderRadius="$3"
            margin="$2"
            backgroundColor="$backgroundHover"
          >
            <Text tag="pre" wordWrap="break-word" width="100%" fontSize={12}>
              <Text
                tag="code"
                fontSize={12}
                backgroundColor="transparent"
                fontFamily="$mono"
              >
                {JSON.stringify(debugData, null, 4)}
              </Text>
            </Text>
          </XStack>
        ) : null}
      </YStack>
    </Tooltip>
  )
}

export function ContentEmbed({
  props,
  document,
  isLoading,
  showReferenced,
  onShowReferenced,
  renderOpenButton,
  EmbedWrapper,
  parentBlockId = null,
}: {
  isLoading: boolean
  props: EntityComponentProps
  document: HMDocument | null | undefined
  showReferenced: boolean
  onShowReferenced: (showReference: boolean) => void
  renderOpenButton: () => React.ReactNode
  EmbedWrapper: React.ComponentType<
    React.PropsWithChildren<{ hmRef: string; parentBlockId: string }>
  >
  parentBlockId: string | null
}) {
  const embedData = useMemo(() => {
    const selectedBlock =
      props.blockRef && document?.content
        ? getBlockNodeById(document.content, props.blockRef)
        : null
    const currentAnnotations = selectedBlock?.block?.annotations || []
    const embedBlocks = props.blockRef
      ? selectedBlock
        ? [
          {
            ...selectedBlock,
            block: {
              ...selectedBlock.block,
              annotations:
                props.blockRange && 'start' in props.blockRange
                  ? [
                    ...currentAnnotations,
                    {
                      type: 'range',
                      starts: [props.blockRange.start],
                      ends: [props.blockRange.end],
                    },
                  ]
                  : currentAnnotations,
            },
            // children:
            //   props.blockRange &&
            //   'expanded' in props.blockRange &&
            //   props.blockRange.expanded
            //     ? [...selectedBlock.children]
            //     : [],
          },
        ]
        : null
      : document?.content

    return {
      ...document,
      data: {
        document,
        embedBlocks,
        blockRange:
          props.blockRange && 'start' in props.blockRange && selectedBlock
            ? {
              blockId: props.blockRef,
              start: props.blockRange.start,
              end: props.blockRange.end,
            }
            : null,
      },
    }
  }, [props.blockRef, props.blockRange, document])

  let content = <BlockContentUnknown {...props} />
  if (isLoading) {
    content = <Spinner />
  }
  //  else if (embedData.data.blockRange) {
  //   content = (
  //     <SizableText
  //       {...inlineContentSize(textUnit * 0.8)}
  //       fontFamily="$editorBody"
  //       fontStyle="italic"
  //     >
  //       {embedData.data.blockRange}
  //     </SizableText>
  //   )
  // }
  else if (embedData.data.embedBlocks) {
    content = (
      <>
        {/* ADD SIDENOTE HERE */}
        <BlockNodeList childrenType="group">
          {!props.blockRef && document?.metadata?.name ? (
            <BlockNodeContent
              key={`title-${pub.document.id}`}
              isFirstChild
              depth={props.depth}
              expanded
              blockNode={{
                block: {
                  type: 'heading',
                  id: `heading-${props.eid}`,
                  text: pub?.document?.title,
                  attributes: {
                    childrenType: 'group',
                  },
                  annotations: [],
                },
                children: embedData.data.embedBlocks as Array<HMBlockNode>,
              }}
              childrenType="group"
              index={0}
              embedDepth={1}
            />
          ) : (
            embedData.data.embedBlocks.map((bn, idx) => (
              <BlockNodeContent
                key={bn.block?.id}
                isFirstChild={
                  !props.blockRef && document?.metadata?.name ? true : idx == 0
                }
                depth={1}
                expanded={!!props.blockRange?.expanded || false}
                blockNode={bn}
                childrenType="group"
                index={idx}
                embedDepth={1}
              />
            ))
          )}
        </BlockNodeList>
        {showReferenced ? (
          <XStack jc="flex-end">
            <Tooltip content="The latest reference was not found. Click to try again.">
              <Button
                size="$2"
                theme="red"
                icon={Undo2}
                onPress={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onShowReferenced(false)
                }}
              >
                Back to Reference
              </Button>
            </Tooltip>
          </XStack>
        ) : null}
      </>
    )
  } else if (props.blockRef) {
    return (
      <BlockNotFoundError
        message={`Block #${props.blockRef} was not found in this version`}
      >
        <XStack gap="$2" paddingHorizontal="$4">
          {props.version ? (
            <Button
              size="$2"
              onPress={() => {
                onShowReferenced(true)
              }}
              icon={MoveLeft}
            >
              Show Referenced Version
            </Button>
          ) : null}
          {renderOpenButton()}
        </XStack>
      </BlockNotFoundError>
    )
  }
  return (
    <EmbedWrapper
      depth={props.depth}
      hmRef={props.id}
      parentBlockId={parentBlockId || ''}
    >
      {content}
    </EmbedWrapper>
  )
}

export function BlockNotFoundError({
  message,
  children,
}: PropsWithChildren<{
  message: string
}>) {
  return (
    <YStack
      theme="red"
      backgroundColor="$backgroundHover"
      f={1}
      paddingVertical="$2"
    >
      <XStack gap="$2" paddingHorizontal="$4" paddingVertical="$2" ai="center">
        <AlertCircle color="$red10" size={12} />
        <SizableText flex={1} color="$red10">
          {message ? message : 'Error'}
        </SizableText>
      </XStack>
      {children}
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

export function BlockContentFile({
  block,
  parentBlockId,
  ...props
}: BlockContentProps) {
  const { hover, ...hoverProps } = useHover()
  const { layoutUnit, saveCidAsFile } = useDocContentContext()
  const fileCid = block.ref ? getCIDFromIPFSUrl(block.ref) : ''
  return (
    <YStack
      // backgroundColor="$color3"
      borderColor="$color6"
      {...hoverProps}
      borderWidth={1}
      borderRadius={layoutUnit / 4}
      padding={layoutUnit / 2}
      overflow="hidden"
      f={1}
      className="block-content block-file"
      data-content-type="file"
      data-url={block.ref}
      data-name={block.attributes?.name}
      data-size={block.attributes?.size}
      hoverStyle={{
        backgroundColor: '$backgroundHover',
      }}
      {...props}
    >
      <XStack
        borderWidth={0}
        outlineWidth={0}
        alignItems="center"
        space
        flex={1}
        width="100%"
      >
        <File size={18} />

        <SizableText
          size="$5"
          // maxWidth="17em"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          userSelect="text"
          flex={1}
        >
          {block.attributes?.name || 'Untitled File'}
        </SizableText>
        {block.attributes?.size && (
          <SizableText paddingTop="$1" color="$color10" size="$2">
            {formatBytes(parseInt(block.attributes?.size))}
          </SizableText>
        )}

        {fileCid && <Tooltip content={`Download ${block.attributes?.name || 'File'}`}>
          <Button
            position="absolute"
            right={0}
            opacity={hover ? 1 : 0}
            size="$2"
            onPress={() => {
              saveCidAsFile(fileCid, block.attributes?.name || 'File')
            }}
          >
            Download
          </Button>
        </Tooltip>}
      </XStack>
    </YStack>
  )
}

export function BlockContentNostr({
  block,
  parentBlockId,
  ...props
}: BlockContentProps) {
  const { layoutUnit } = useDocContentContext()
  const name = block.attributes?.name ?? ''
  const nostrNpud = nip19.npubEncode(name) ?? ''

  const [verified, setVerified] = useState<boolean>()
  const [content, setContent] = useState<string>()

  const uri = `nostr:${nostrNpud}`
  const header = `${nostrNpud.slice(0, 6)}...${nostrNpud.slice(-6)}`

  if (
    block.ref &&
    block.ref !== '' &&
    (content === undefined || verified === undefined)
  ) {
    const cid = getCIDFromIPFSUrl(block.ref)
    fetch(`${API_HTTP_URL}/ipfs/${cid}`, {
      method: 'GET',
    }).then((response) => {
      if (response) {
        response.text().then((text) => {
          if (text) {
            const fileEvent = JSON.parse(text)
            if (content === undefined) setContent(fileEvent.content)
            if (verified === undefined && validateEvent(fileEvent)) {
              setVerified(verifySignature(fileEvent))
            }
          }
        })
      }
    })
  }

  return (
    <YStack
      // backgroundColor="$color3"
      borderColor="$color6"
      borderWidth={1}
      borderRadius={layoutUnit / 4}
      padding={layoutUnit / 2}
      overflow="hidden"
      width="100%"
      className="block-content block-nostr"
      hoverStyle={{
        backgroundColor: '$backgroundHover',
      }}
      {...props}
    >
      <XStack justifyContent="space-between">
        <SizableText
          size="$5"
          maxWidth="17em"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          userSelect="text"
          flex={1}
        >
          {'Public Key: '}
          {nip21.test(uri) ? <a href={uri}>{header}</a> : { header }}
        </SizableText>
        <Tooltip
          content={
            verified === undefined
              ? ''
              : verified
                ? 'Signature verified'
                : 'Invalid signature'
          }
        >
          <Button
            size="$2"
            disabled
            theme={
              verified === undefined ? 'blue' : verified ? 'green' : 'orange'
            }
            icon={
              verified === undefined
                ? RiRefreshLine
                : verified
                  ? RiCheckFill
                  : RiCloseCircleLine
            }
          />
        </Tooltip>
      </XStack>
      <XStack justifyContent="space-between">
        <Text size="$6" fontWeight="bold">
          {content}
        </Text>
      </XStack>
    </YStack>
  )
}

export function BlockContentXPost({
  block,
  parentBlockId,
  ...props
}: BlockContentProps) {
  const { layoutUnit, onLinkClick } = useDocContentContext()
  const urlArray = block.ref?.split('/')
  const xPostId = urlArray?.[urlArray.length - 1].split('?')[0]
  const { data, error, isLoading } = useTweet(xPostId)

  let xPostContent

  if (isLoading) xPostContent = <XPostSkeleton />
  else if (error || !data) {
    xPostContent = <XPostNotFound error={error} />
  } else {
    const xPost = enrichTweet(data)
    xPostContent = (
      <YStack width="100%">
        <TweetHeader tweet={xPost} />
        {xPost.in_reply_to_status_id_str && <TweetInReplyTo tweet={xPost} />}
        <TweetBody tweet={xPost} />
        {xPost.mediaDetails?.length ? <TweetMedia tweet={xPost} /> : null}
        {xPost.quoted_tweet && <QuotedTweet tweet={xPost.quoted_tweet} />}
        <TweetInfo tweet={xPost} />
      </YStack>
    )
  }

  return (
    <YStack
      {...blockStyles}
      {...props}
      borderColor="$color6"
      backgroundColor="$color4"
      borderWidth={1}
      borderRadius={layoutUnit / 4}
      padding={layoutUnit / 2}
      overflow="hidden"
      width="100%"
      marginHorizontal={(-1 * layoutUnit) / 2}
      className="x-post-container"
      data-content-type="web-embed"
      data-url={block.ref}
      onPress={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (block.ref) {
          onLinkClick(block.ref, e)
        }
      }}
    >
      {xPostContent}
    </YStack>
  )
}

export function BlockContentCode({
  block,
  parentBlockId,
  ...props
}: BlockContentProps) {
  const { layoutUnit, debug, textUnit } = useDocContentContext()
  function getHighlightNodes(result: any) {
    return result.value || result.children || []
  }

  const CodeHighlight = ({ node }: { node: any }) => {
    if (node.type === 'text') {
      return node.value
    }

    if (node.type === 'element') {
      const { tagName, properties, children } = node
      if (properties.className && Array.isArray(properties.className)) {
        properties.className = properties.className[0]
      }
      return createElement(
        tagName,
        { ...properties },
        children &&
        children.map((child: any, index: number) => (
          <CodeHighlight key={index} node={child} />
        )),
      )
    }

    return null
  }
  const lowlight = useLowlight(common)
  const language = block.attributes?.language
  const nodes: any[] =
    language && language.length > 0
      ? getHighlightNodes(lowlight.highlight(language, block.text))
      : []

  return (
    <YStack
      {...blockStyles}
      {...props}
      borderColor="$color6"
      backgroundColor="$color4"
      borderWidth={1}
      borderRadius={layoutUnit / 4}
      padding={layoutUnit / 2}
      overflow="hidden"
      data-content-type="codeBlock"
      width="100%"
      {...debugStyles(debug, 'blue')}
      marginHorizontal={(-1 * layoutUnit) / 2}
    >
      <XStack
        tag="pre"
        className={'language-' + language}
        flex="unset"
        overflow="auto"
      >
        <Text
          tag="code"
          whiteSpace="pre"
          fontFamily="$mono"
          lineHeight={textUnit * 1.5}
          fontSize={textUnit * 0.85}
        >
          {nodes.length > 0
            ? nodes.map((node, index) => (
              <CodeHighlight key={index} node={node} />
            ))
            : block.text}
        </Text>
      </XStack>
    </YStack>
  )
}

export function BlockContentMath({
  block,
  parentBlockId,
  ...props
}: BlockContentProps) {
  const { layoutUnit } = useDocContentContext()

  const tex = katex.renderToString(block.text ? block.text : '', {
    throwOnError: true,
    displayMode: true,
  })

  return (
    <YStack
      {...blockStyles}
      {...props}
      className="block-content block-katex"
      paddingVertical="$3"
      gap="$2"
      ai="center"
      width="100%"
      borderColor="$color6"
      backgroundColor="$color4"
      borderWidth={1}
      borderRadius={layoutUnit / 4}
      data-content-type="math"
      data-content={block.text}
      padding={layoutUnit / 2}
      overflow="hidden"
      marginHorizontal={(-1 * layoutUnit) / 2}
    >
      <SizableText
        ai="center"
        ac="center"
        dangerouslySetInnerHTML={{ __html: tex }}
      ></SizableText>
    </YStack>
  )
}

function getSourceType(name?: string) {
  if (!name) return
  const nameArray = name.split('.')
  return `video/${nameArray[nameArray.length - 1]}`
}

export function useBlockCitations(blockId?: string) {
  const context = useDocContentContext()

  let citations = useMemo(() => {
    if (!context.citations?.length) return []
    return context.citations.filter((c) => {
      return c.targetFragment == blockId
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
}: CheckboxProps & { size: SizeTokens; label: string }) {
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

function RadioGroupItemWithLabel(props: { value: string; label: string }) {
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

export function DocumentCardView({
  title,
  textContent,
  editors,
  AvatarComponent,
  date,
}: {
  title?: string
  textContent?: string
  editors?: Array<string>
  AvatarComponent: React.FC<{ accountId?: string }>
  date?: Timestamp
}) {
  return (
    <XStack padding="$2">
      <YStack flex={1} gap="$2">
        <SizableText
          size="$7"
          fontWeight="bold"
          textAlign="left"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          overflow="hidden"
        >
          {title}
        </SizableText>
        {/* the maxHeight here is defined by the lineHeight of the content,
        so if we change the size of the text we need to change the maxHeight too */}
        <YStack overflow="hidden" maxHeight={20 * 3}>
          <SizableText>{textContent}</SizableText>
        </YStack>
        <XStack gap="$3" ai="center">
          <EditorsAvatars editors={editors} AvatarComponent={AvatarComponent} />
          {date ? (
            <SizableText size="$1">{formattedDate(date)}</SizableText>
          ) : null}
        </XStack>
      </YStack>
    </XStack>
  )
}

export function getBlockNode(
  blockNodes: HMBlockNode[] | undefined,
  blockId: string,
): HMBlockNode | null {
  if (!blockNodes) return null
  for (const node of blockNodes) {
    if (node.block.id === blockId) return node
    if (node.children) {
      const found = getBlockNode(node.children, blockId)
      if (found) return found
    }
  }
  return null
}

function EditorsAvatars({
  editors,
  AvatarComponent,
}: {
  editors?: Array<string>
  AvatarComponent: React.FC<{ accountId?: string }>
}) {
  return (
    <XStack marginLeft={6}>
      {editors?.map((editor, idx) => (
        <XStack
          zIndex={idx + 1}
          key={editor}
          borderColor="$color4"
          backgroundColor="$color4"
          borderWidth={2}
          borderRadius={100}
          marginLeft={-8}
          animation="fast"
        >
          <AvatarComponent accountId={editor} />
        </XStack>
      ))}
    </XStack>
  )
}
