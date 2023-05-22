import {features} from '@app/constants'
import {useCitationsForBlock} from '@app/editor/comments/citations-context'
import {Dropdown} from '@app/editor/dropdown'
import {EditorMode} from '@app/editor/plugin-utils'
import {insertInline, setList, setType} from '@app/editor/utils'
import {MouseInterpret, useHoveredBlockId, useMouse} from '@app/mouse-context'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {useNavRoute} from '@app/utils/navigation'
import {ConversationBlockBubble} from '@components/conversation-block-bubble'
import {
  blockquote,
  code,
  file,
  FlowContent,
  group,
  heading,
  image,
  MINTTER_LINK_PREFIX,
  ol,
  statement,
  ul,
  video,
} from '@mintter/shared'
import {
  Add,
  ArrowUpRight,
  BlockQuote,
  Button,
  Code,
  Copy,
  HeadingIcon,
  ImageIcon,
  File as FileIcon,
  Menu,
  OrderedList,
  SizableText,
  Strong,
  UnorderedList,
  VideoIcon,
  XStack,
} from '@mintter/ui'
import {Fragment, useState} from 'react'
import {toast} from 'react-hot-toast'
import {Editor, NodeEntry} from 'slate'
import './styles/blocktools.scss'

// export function DraftBlocktools() {
//   return (
//     <XStack>
//       <Popover>
//         <Popover.Trigger asChild>
//           <Button icon={Star} />
//         </Popover.Trigger>

//         <Popover.Anchor></Popover.Anchor>
//       </Popover>
//     </XStack>
//   )
// }

export function DraftBlocktools({
  editor,
  current,
}: {
  current: NodeEntry<FlowContent>
  editor: Editor
}) {
  let mouseService = useMouse()
  let hoveredBlockId = useHoveredBlockId()
  let [localOpen, setLocalOpen] = useState(false)

  let [block, path] = current

  return (
    <XStack
      alignItems="center"
      gap="$1"
      opacity={block.id == hoveredBlockId ? 1 : 0}
    >
      <Dropdown.Root
        modal
        open={localOpen}
        onOpenChange={(isOpen) => {
          mouseService.send(
            isOpen ? 'DISABLE.BLOCKTOOLS.OPEN' : 'DISABLE.BLOCKTOOLS.CLOSE',
          )
          setLocalOpen(isOpen)
        }}
      >
        <Dropdown.Trigger icon={Add} data-testid="blocktools-trigger" />
        <Dropdown.Portal>
          <Dropdown.Content side="right" align="start">
            {Object.entries(items).map(([key, value], index, arr) => {
              return (
                <Fragment key={key}>
                  <Dropdown.Label>{key}</Dropdown.Label>
                  {value.map((item) => (
                    <Dropdown.Item
                      contentEditable={false}
                      data-testid={`item-${item.label}`}
                      key={item.label}
                      onPress={() => {
                        console.log('ON SELECT', current)

                        // if (element) {

                        item.onSelect(editor, {
                          element: block,
                          at: path,
                        })
                        // }
                        mouseService.send('DISABLE.CHANGE')
                      }}
                      title={item.label}
                      icon={item.icon}
                    />
                  ))}
                  {arr.length > index + 1 && <Dropdown.Separator />}
                </Fragment>
              )
            })}
          </Dropdown.Content>
        </Dropdown.Portal>
      </Dropdown.Root>
    </XStack>
  )
}

export function PublicationBlocktools({
  current,
}: {
  current: NodeEntry<FlowContent>
}) {
  let hoveredBlockId = useHoveredBlockId()
  let [block] = current
  let route = useNavRoute()

  const onCopy = () => {
    if (route.key == 'publication') {
      let reference = `${MINTTER_LINK_PREFIX}${route.documentId}`
      if (route.versionId) reference += `?v=${route.versionId}`
      if (current[0]) reference += `#${current[0].id}`
      copyTextToClipboard(reference)
      toast.success('Document reference copied!')
    }
  }

  return (
    <XStack alignItems="center">
      <Button
        opacity={block.id == hoveredBlockId ? 1 : 0}
        size="$2"
        theme="blue"
        icon={Copy}
        onPress={onCopy}
      />
      {features.comments && current[0] ? (
        <ConversationBlockBubble block={current[0]} />
      ) : null}

      <CitationNumber block={current[0]} />
    </XStack>
  )
}

type BlockData = {
  mouseService: MouseInterpret
  editor: Editor
  show: boolean
  mode: EditorMode
  element?: NodeEntry<FlowContent>
  onComment?: () => void
}

// function useBlocktoolsData(editor: Editor): BlockData {
//   let mouseService = useMouse()

//   let element = getEditorBlock(editor, {
//     id,
//   })

//   let show = useSelector(mouseService, (state) => state.matches('active'))

//   return {
//     mouseService,
//     editor,
//     show: show && !!rect,
//     // show: true,
//     mode: editor.mode,
//     element,
//   }
// }

var items: {
  [key: string]: Array<{
    label: string
    icon: any
    onSelect: ReturnType<typeof insertInline | typeof setList>
  }>
} = {
  'Insert inline': [
    {
      label: 'Image',
      icon: ImageIcon,
      onSelect: insertInline(image),
    },
    {
      label: 'Video',
      icon: VideoIcon,
      onSelect: insertInline(video),
    },
    {
      label: 'File',
      icon: FileIcon,
      onSelect: insertInline(file),
    }
  ],
  'Turn Block into': [
    {
      label: 'Heading',
      icon: HeadingIcon,
      onSelect: setType(heading),
    },
    {
      label: 'Statement',
      icon: Strong,
      onSelect: setType(statement),
    },
    {
      label: 'Blockquote',
      icon: BlockQuote,
      onSelect: setType(blockquote),
    },
    {
      label: 'Code block',
      icon: Code,
      onSelect: setType(code),
    },
  ],
  'Turn group into': [
    {
      label: 'Bullet List',
      icon: UnorderedList,
      onSelect: setList(ul),
    },
    {
      label: 'Ordered List',
      icon: OrderedList,
      onSelect: setList(ol),
    },
    {
      label: 'Plain List',
      icon: Menu,
      onSelect: setList(group),
    },
  ],
}

function CitationNumber({block}: {block: FlowContent}) {
  let {citations = [], onCitationsOpen} = useCitationsForBlock(block.id)

  return citations?.length ? (
    <Button
      theme="blue"
      onPress={() => {
        onCitationsOpen(citations)
      }}
      size="$2"
      userSelect="none"
      hoverTheme
      hoverStyle={{
        backgroundColor: '$background',
        cursor: 'pointer',
      }}
      icon={ArrowUpRight}
      //@ts-ignore
      contentEditable={false}
    >
      <SizableText color="$color" size="$1">
        {citations.length}
      </SizableText>
    </Button>
  ) : null
}

// function BlockCommentForm({
//   onBlur,
//   blockId,
//   docId,
//   blockRevision,
// }: {
//   onBlur: () => void
//   blockId: string
//   blockRevision: string
//   docId: string
// }) {
//   const [comment, setComment] = useState('')
//   return (
//     <OutsideClick onClose={onBlur}>
//       <Box
//         css={{
//           position: 'absolute',
//           zIndex: '$max',
//           right: -50,
//         }}
//       >
//         <CommentForm
//           comment={comment}
//           onChange={setComment}
//           onSubmit={(e) => {
//             e.preventDefault()
//             onBlur()
//             let selector = new Selector({
//               blockId,
//               blockRevision,
//               start: 0,
//               end: 0,
//             })
//             let commentValue = comment.replace(/\s/g, ' ')
//             let initialComment = blockToApi(
//               statement([paragraph([text(commentValue)])]),
//             )
//             commentsClient
//               .createConversation({
//                 documentId: docId,
//                 initialComment,
//                 selectors: [selector],
//               })
//               .then((res) => {
//                 // service.send('TOOLBAR.DISMISS')
//                 // setCurrentComment('')
//                 // ReactEditor.blur(editor)
//                 appInvalidateQueries([queryKeys.GET_PUBLICATION_CONVERSATIONS])
//                 toast.success('Comment added')
//               })
//           }}
//         />
//       </Box>
//     </OutsideClick>
//   )
// }
