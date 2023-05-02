import {useDrag} from '@app/drag-context'
import {ELEMENT_BLOCKQUOTE} from '@app/editor/blockquote'
import {ELEMENT_CODE} from '@app/editor/code'
import {Dropdown} from '@app/editor/dropdown'
import {ELEMENT_HEADING} from '@app/editor/heading'
import {EditorMode} from '@app/editor/plugin-utils'
import {ELEMENT_STATEMENT} from '@app/editor/statement'
import {getEditorBlock, insertInline, setList, setType} from '@app/editor/utils'
import {
  MouseInterpret,
  useCurrentBound,
  useCurrentTarget,
  useMouse,
} from '@app/mouse-context'
import {useNavRoute} from '@app/utils/navigation'
import {
  blockquote,
  code,
  FlowContent,
  group,
  heading,
  image,
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
  Drag,
  HeadingIcon,
  ImageIcon,
  ListItem,
  ListItemProps,
  Menu,
  OrderedList,
  SizableText,
  Strong,
  UnorderedList,
  VideoIcon,
  XStack,
} from '@mintter/ui'
import {useSelector} from '@xstate/react'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {forwardRef, Fragment, useMemo, useState} from 'react'
import {toast} from 'react-hot-toast'
import {Editor, NodeEntry} from 'slate'
import {ReactEditor, useSlate} from 'slate-react'
import {EditorHoveringActions} from './hovering-toolbar'
import './styles/blocktools.scss'
import {features} from '@app/constants'
import {ConversationBlockBubble} from '@components/conversation-block-bubble'
import {useCitationsForBlock} from '@app/editor/comments/citations-context'

export function DraftBlocktools({current}: {current: NodeEntry<FlowContent>}) {
  let btProps = useBlockToolsProps(current)
  let {mouseService, element, editor, show} = btProps
  let dragService = useDrag()
  let [localOpen, setLocalOpen] = useState(false)

  let [block, path] = current

  return (
    <XStack alignItems="center" opacity={show ? 1 : 0}>
      <Dropdown.Root
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
                      onSelect={() => {
                        console.log('ON SELECT!!', element)
                        // if (element) {
                        mouseService.send('DISABLE.CHANGE')
                        item.onSelect(editor, {
                          element: block,
                          at: path,
                        })
                        // }
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
      <Button
        size="$2"
        icon={Drag}
        onPointerDown={() => {
          if (editor.dragging) return
          const [node, fromPath] = element as NodeEntry<FlowContent>
          const domNode = ReactEditor.toDOMNode(editor, node)
          if (fromPath && dragService && domNode) {
            mouseService.send('DISABLE.DRAG.START')
            dragService.send({
              type: 'DRAG.START',
              fromPath,
              element: domNode as HTMLLIElement,
            })
          }
        }}
      />
    </XStack>
  )
}

export function PublicationBlocktools({
  current,
}: {
  current: NodeEntry<FlowContent>
}) {
  let {show} = useBlockToolsProps(current)
  let target = useCurrentTarget()

  // let [match, setMatch] = useState(false)

  // useEffect(() => {
  //   let responsiveMedia = window.matchMedia('(max-width: 768px)')
  //   if (typeof responsiveMedia.addEventListener == 'function') {
  //     responsiveMedia.addEventListener('change', handler)
  //   } else if (typeof responsiveMedia.addListener == 'function') {
  //     responsiveMedia.addListener(handler)
  //   } else {
  //     error('matchMedia support error', responsiveMedia)
  //   }

  //   setMatch(responsiveMedia.matches)
  //   function handler(event: MediaQueryListEvent) {
  //     setMatch(event.matches)
  //   }
  // }, [])

  const copyUrl = target?.dataset.reference
  return (
    <XStack alignItems="center">
      <Button
        opacity={show ? 1 : 0}
        size="$2"
        theme="blue"
        icon={Copy}
        onPress={() => {
          if (!copyUrl) return
          copyTextToClipboard(copyUrl).then(() => {
            toast.success(`Copied link to block`)
          })
        }}
      />
      {features.comments && current[0] ? (
        <ConversationBlockBubble block={current[0]} />
      ) : null}

      <CitationNumber block={current[0]} />
    </XStack>
    // <EditorHoveringActions
    //   onCopyLink={copyUrl ? () => copyUrl : undefined}
    //   onComment={props.onComment}
    //   copyLabel="block"
    // />
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

function useBlocktoolsData(editor: Editor): BlockData {
  let mouseService = useMouse()
  let [id, rect] = useCurrentBound() || []

  let element = getEditorBlock(editor, {
    id,
  })

  let show = useSelector(mouseService, (state) => state.matches('active'))

  return {
    mouseService,
    editor,
    show: show && !!rect,
    // show: true,
    mode: editor.mode,
    element,
  }
}

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

function useBlockToolsProps(current: NodeEntry<FlowContent>) {
  const editor = useSlate()

  let [block] = current

  const blocktoolsProps = useBlocktoolsData(editor)
  // const [isCommenting, setIsCommenting] = useState(false)

  let {show, element, mode} = blocktoolsProps

  return {
    ...blocktoolsProps,
    show: show && element && element[0].id == block.id ? true : false,
    current,
  }
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
