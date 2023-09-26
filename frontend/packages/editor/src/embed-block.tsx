import {PartialMessage} from '@bufbuild/protobuf'
import {usePublication} from '@mintter/app/src/models/documents'
import {useOpenUrl} from '@mintter/app/src/open-url'
import {
  NavRoute,
  unpackHmIdWithAppRoute,
} from '@mintter/app/src/utils/navigation'
import {useNavigate} from '@mintter/app/src/utils/useNavigate'
import type {
  Account,
  BlockNode,
  Group,
  HeadingBlock,
  ImageBlock,
  ParagraphBlock,
  PresentationBlock,
  Block as ServerBlock,
} from '@mintter/shared'
import {
  BACKEND_FILE_URL,
  Block,
  EmbedBlock as EmbedBlockType,
  createHmId,
  getCIDFromIPFSUrl,
  isHypermediaScheme,
  serverBlockToEditorInline,
  unpackDocId,
  unpackHmId,
} from '@mintter/shared'
import {
  Avatar,
  Spinner,
  Text,
  UIAvatar,
  View,
  XStack,
  YStack,
  styled,
} from '@mintter/ui'
import {AlertCircle, Book} from '@tamagui/lucide-icons'
import {ComponentProps, useEffect, useMemo, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {
  Block as BlockNoteBlock,
  BlockNoteEditor,
  InlineContent,
} from './blocknote'
import {getBlockInfoFromPos} from './blocknote/core'
import {createReactBlockSpec} from './blocknote/react'
import {HMBlockSchema, hmBlockSchema} from './schema'
import {useSelected} from './block-utils'
import {useGroup} from '@mintter/app/src/models/groups'
import {useAccount} from '@mintter/app/src/models/accounts'
import {getAvatarUrl} from '@mintter/app/src/utils/account-url'

const EditorText = styled(Text, {
  fontSize: '$5',
  lineHeight: 1.5,
  fontFamily: '$body',
  // "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont,'Open Sans', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell','Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
})

function InlineContentView({
  inline,
  style,
}: {
  inline: InlineContent[]
  style?: ComponentProps<typeof EditorText>
}) {
  const openUrl = useOpenUrl()
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
            <EditorText
              {...style}
              key={`${content.type}-${index}`}
              fontWeight={content.styles.bold ? 'bold' : style?.fontWeight}
              textDecorationLine={textDecorationLine || undefined}
              // fontStyle={content.styles.italic ? 'italic' : undefined}
              fontFamily={content.styles.code ? '$mono' : '$body'}
            >
              {content.text}
            </EditorText>
          )
        }
        if (content.type === 'link') {
          return (
            <EditorText
              {...style}
              className={isHypermediaScheme(content.href) ? 'hm-link' : 'link'}
              key={index}
              onPress={() => {
                openUrl(content.href, true)
              }}
              color="$blue10"
              hoverStyle={{
                color: '$blue10',
                cursor: 'pointer',
              }}
            >
              <InlineContentView style={style} inline={content.content} />
            </EditorText>
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
  const style =
    block.type === 'heading' ? {fontSize: '$7', fontWeight: 'bold'} : undefined
  return (
    <View marginTop={12} marginBottom={3}>
      <InlineContentView inline={inline} style={style} />
    </View>
  )
}

function StaticImageBlock({block}: {block: ImageBlock}) {
  const cid = getCIDFromIPFSUrl(block?.ref)
  if (!cid) return null
  return (
    <img src={`${BACKEND_FILE_URL}/${cid}`} alt={`image block: ${block.id}`} />
  )
}

function StaticBlock({block}: {block: ServerBlock}) {
  // TODO: validation
  let niceBlock = block as PresentationBlock

  if (niceBlock.type === 'paragraph' || niceBlock.type === 'heading') {
    return <StaticSectionBlock block={niceBlock} />
  }
  if (niceBlock.type === 'image') {
    return <StaticImageBlock block={niceBlock} />
  }
  if (niceBlock.type === 'embed') {
    return <StaticEmbedPresentation block={niceBlock} />
  }
  if (niceBlock.type === 'code') {
    // @ts-expect-error
    return <StaticSectionBlock block={niceBlock} />
  }
  // fallback for unknown block types
  // return <span>{JSON.stringify(block)}</span>
  return <EditorText>mystery block 👻</EditorText>
}

function EntityCard({
  title,
  icon,
  description,
  route,
}: {
  title?: string
  icon?: React.ReactNode
  description?: string
  route: NavRoute
}) {
  return (
    <XStack gap="$3">
      {icon}
      <YStack>
        <Text fontWeight={'bold'}>{title}</Text>
        <Text>{description}</Text>
      </YStack>
    </XStack>
  )
}
function GroupCard({group}: {group: Group}) {
  return (
    <EntityCard
      title={group.title}
      description={group.description}
      route={{key: 'group', groupId: group.id}}
      icon={<Book />}
    />
  )
}
function AccountCard({account}: {account: Account}) {
  return (
    <EntityCard
      title={account.profile?.alias}
      description={account.profile?.bio}
      route={{key: 'account', accountId: account.id}}
      icon={
        <UIAvatar
          id={account.id}
          size="$2"
          label={account.profile?.alias}
          url={getAvatarUrl(account.profile?.avatar)}
        />
      }
    />
  )
}

function EmbedPresentation({
  block,
  editor,
}: {
  block: BlockNoteBlock<typeof hmBlockSchema>
  editor: BlockNoteEditor<typeof hmBlockSchema>
}) {
  let spawn = useNavigate('spawn')
  let embed = useEmbed(block.props.ref)
  let content = <Spinner />
  const selected = useSelected(block, editor)

  const isCardStyle = !!embed.account || !!embed.group
  if (embed.embedBlocks) {
    content = (
      <>
        {embed.embedBlocks?.map((block) => (
          <StaticBlockNode key={block.block?.id} block={block} />
        ))}
      </>
    )
  } else if (embed.account) {
    content = <AccountCard account={embed.account} />
  } else if (embed.group) {
    content = <GroupCard group={embed.group} />
  }

  return (
    <YStack
      // @ts-expect-error
      contentEditable={false}
      data-ref={block.props.ref}
      style={{userSelect: 'none'}}
      backgroundColor={selected ? '$color4' : '$color3'}
      borderColor={selected ? '$color8' : 'transparent'}
      borderWidth={2}
      borderRadius="$4"
      overflow="hidden"
      hoverStyle={{
        backgroundColor: '$color4',
        ...(isCardStyle
          ? {
              cursor: 'pointer',
            }
          : {}),
      }}
    >
      <YStack
        padding="$4"
        paddingVertical="$2"
        onPress={() => {
          if (editor?.isEditable) {
            return
          }
          const unpacked = unpackHmIdWithAppRoute(block.props.ref)
          if (unpacked?.navRoute && unpacked?.scheme === 'hm') {
            spawn(unpacked?.navRoute)
          }
        }}
      >
        {content}
      </YStack>
    </YStack>
  )
}

function StaticEmbedPresentation({block}: {block: EmbedBlockType}) {
  let embed = useEmbed(block.ref)
  let content = <Spinner />
  if (embed.embedBlocks) {
    content = (
      <>
        {embed.embedBlocks?.map((block) => (
          <StaticBlockNode key={block.block?.id} block={block} />
        ))}
      </>
    )
  } else if (embed.account) {
    content = <AccountCard account={embed.account} />
  } else if (embed.group) {
    content = <GroupCard group={embed.group} />
  }

  return (
    <YStack
      // @ts-expect-error
      contentEditable={false}
      data-ref={block.ref}
      style={{userSelect: 'none'}}
    >
      <YStack
        backgroundColor="$color5"
        borderColor="$color8"
        borderWidth={1}
        padding="$4"
        paddingVertical="$2"
        borderRadius="$4"
      >
        {content}
      </YStack>
    </YStack>
  )
}

export function StaticBlockNode({block}: {block: BlockNode}) {
  const children =
    block.children.length > 0 ? (
      <YStack paddingLeft="$5">
        {block.children.map((child, index) => (
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
function EmbedError() {
  return (
    <XStack
      backgroundColor="$red5"
      borderColor="$red8"
      borderWidth={1}
      padding="$4"
      paddingVertical="$2"
      borderRadius="$4"
      gap="$2"
    >
      <AlertCircle size={18} color="$red10" />
      <Text>Failed to load this Embedded document</Text>
    </XStack>
  )
}
export const EmbedBlock = createReactBlockSpec({
  type: 'embed',
  propSchema: {
    ref: {
      default: '',
    },
  },
  containsInlineContent: true,

  render: ({block, editor}) => {
    return (
      <ErrorBoundary FallbackComponent={EmbedError}>
        <EmbedPresentation block={block} editor={editor} />
      </ErrorBoundary>
    )
  },
})

function useEmbed(ref: string): {
  isLoading: boolean
  embedBlocks: (BlockNode[] & PartialMessage<BlockNode>[]) | undefined
  group: Group | undefined
  account: Account | undefined
} {
  const id = unpackHmId(ref)
  const docId = id?.type === 'd' ? createHmId('d', id?.eid) : undefined
  let pubQuery = usePublication({
    documentId: docId,
    versionId: id?.version || undefined,
    enabled: !!docId,
  })
  const groupId = id?.type === 'g' ? createHmId('g', id?.eid) : undefined
  const groupQuery = useGroup(groupId, id?.version || undefined)
  const accountId = id?.type === 'a' ? id?.eid : undefined
  const accountQuery = useAccount(accountId)
  return useMemo(() => {
    const data = pubQuery.data

    const selectedBlock =
      id?.blockRef && data?.document?.children
        ? getBlockNodeById(data.document.children, id?.blockRef)
        : null

    const embedBlocks = selectedBlock
      ? [selectedBlock]
      : data?.document?.children

    return {
      isLoading:
        pubQuery.isLoading || accountQuery.isLoading || groupQuery.isLoading,
      error: pubQuery.error || accountQuery.error || groupQuery.error,
      embedBlocks,
      account: accountQuery.data,
      group: groupQuery.data,
    }
  }, [pubQuery, accountQuery, groupQuery, id?.blockRef])
}

function getBlockNodeById(
  blocks: Array<BlockNode>,
  blockId: string,
): BlockNode | null {
  if (!blockId) return null

  let res: BlockNode | undefined
  blocks.find((bn) => {
    if (bn.block?.id == blockId) {
      res = bn
      return true
    } else if (bn.children.length) {
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
