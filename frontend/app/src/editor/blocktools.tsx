import {commentsClient} from '@app/api-clients'
import {Text} from '@components/text'
import {useDrag} from '@app/drag-context'
import {ELEMENT_BLOCKQUOTE} from '@app/editor/blockquote'
import {ELEMENT_CODE} from '@app/editor/code'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {ELEMENT_HEADING} from '@app/editor/heading'
import {EditorMode} from '@app/editor/plugin-utils'
import {ELEMENT_STATEMENT} from '@app/editor/statement'
import {getEditorBlock, insertInline, setList, setType} from '@app/editor/utils'
import {queryKeys} from '@app/hooks'
import {
  MouseInterpret,
  useCurrentBound,
  useCurrentTarget,
  useMouse,
} from '@app/mouse-context'
import {appInvalidateQueries} from '@app/query-client'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon, icons} from '@components/icon'
import {inline, offset, shift, flip, useFloating} from '@floating-ui/react-dom'
import {
  blockquote,
  blockToApi,
  code,
  FlowContent,
  group,
  heading,
  image,
  isGroup,
  isGroupContent,
  ol,
  paragraph,
  Selector,
  statement,
  text,
  ul,
  video,
} from '@mintter/shared'
import {useSelector} from '@xstate/react'
import {Fragment, MouseEvent, useMemo, useState} from 'react'
import toast from 'react-hot-toast'
import {Editor, Node, NodeEntry, Path} from 'slate'
import {ReactEditor, useSlate} from 'slate-react'
import {CommentForm, EditorHoveringActions} from './hovering-toolbar'
import {OutsideClick} from './outside-click'
import './styles/blocktools.scss'
import {useNavRoute} from '@app/utils/navigation'

let toolsByMode = {
  [EditorMode.Draft]: DraftBlocktools,
  [EditorMode.Publication]: PublicationBlocktools,
  [EditorMode.Discussion]: () => null,
  [EditorMode.Embed]: () => null,
  [EditorMode.Mention]: () => null,
}

function DraftBlocktools(props: BlockData) {
  let {mouseService, element, editor} = props
  let dragService = useDrag()
  let topOffset = useTopOffset(element)
  let [localOpen, setLocalOpen] = useState(false)
  let [isMouseDown, setMouseDown] = useState(false)

  let hasMarker = useMemo(() => {
    if (!element) return false
    let [, path] = element

    let parentPath = Path.parent(path)
    let parent = Node.get(editor, parentPath)
    if (isGroupContent(parent)) {
      return !isGroup(parent)
    } else {
      return false
    }
  }, [props.element])

  return (
    <Box
      contentEditable={false}
      css={{
        width: 30,
        height: 24,
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: '$4',
        transform: `translate(${hasMarker ? '-40px' : '-24px'}, ${topOffset})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '$3',
      }}
    >
      <ElementDropdown
        data-testid="blocktools-trigger"
        onMouseDown={() => {
          setMouseDown(true)
        }}
        onMouseMove={() => {
          if (isMouseDown) {
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
          }
        }}
        onMouseUp={() => {
          setMouseDown(false)
          setLocalOpen((p) => !p)
          mouseService.send(
            !localOpen ? 'DISABLE.BLOCKTOOLS.OPEN' : 'DISABLE.BLOCKTOOLS.CLOSE',
          )
        }}
      >
        <Icon name="Grid4" color="muted" />
      </ElementDropdown>
      <Dropdown.Root
        open={localOpen}
        onOpenChange={(isOpen) => {
          setLocalOpen(isOpen)
          mouseService.send(
            isOpen ? 'DISABLE.BLOCKTOOLS.OPEN' : 'DISABLE.BLOCKTOOLS.CLOSE',
          )
        }}
      >
        <Dropdown.Trigger asChild>
          <ElementDropdown
            data-testid="blocktools-trigger"
            style={{opacity: 0, visibility: 'hidden'}}
          >
            <Icon name="Grid4" color="muted" />
          </ElementDropdown>
        </Dropdown.Trigger>
        <Dropdown.Portal>
          <Dropdown.Content side="right" align="start">
            {Object.entries(items).map(([key, value], index, arr) => {
              return (
                <Fragment key={key}>
                  <Dropdown.Label>
                    <Text color="muted" size="2" css={{padding: '$3'}}>
                      {key}
                    </Text>
                  </Dropdown.Label>
                  {value.map((item) => (
                    <Dropdown.Item
                      data-testid={`item-${item.label}`}
                      key={item.label}
                      onSelect={() => {
                        if (element) {
                          mouseService.send('DISABLE.CHANGE')
                          item.onSelect(editor, {
                            element: element[0],
                            at: element[1],
                          })
                        }
                      }}
                    >
                      <Icon size="2" name={item.iconName} />
                      {item.label}
                    </Dropdown.Item>
                  ))}
                  {arr.length > index + 1 && <Dropdown.Separator />}
                </Fragment>
              )
            })}
          </Dropdown.Content>
        </Dropdown.Portal>
      </Dropdown.Root>
    </Box>
  )
}
function BlockCommentForm({
  onBlur,
  blockId,
  docId,
  blockRevision,
}: {
  onBlur: () => void
  blockId: string
  blockRevision: string
  docId: string
}) {
  const [comment, setComment] = useState('')
  return (
    <OutsideClick onClose={onBlur}>
      <Box
        css={{
          position: 'absolute',
          zIndex: '$max',
          right: -50,
        }}
      >
        <CommentForm
          comment={comment}
          onChange={setComment}
          onSubmit={(e) => {
            e.preventDefault()
            onBlur()
            let selector = new Selector({
              blockId,
              blockRevision,
              start: 0,
              end: 0,
            })
            let commentValue = comment.replace(/\s/g, ' ')
            let initialComment = blockToApi(
              statement([paragraph([text(commentValue)])]),
            )
            commentsClient
              .createConversation({
                documentId: docId,
                initialComment,
                selectors: [selector],
              })
              .then((res) => {
                // service.send('TOOLBAR.DISMISS')
                // setCurrentComment('')
                // ReactEditor.blur(editor)
                appInvalidateQueries([queryKeys.GET_PUBLICATION_CONVERSATIONS])
                toast.success('Comment added')
              })
          }}
        />
      </Box>
    </OutsideClick>
  )
}

function PublicationBlocktools(props: BlockData) {
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

  let topOffset = useTopOffset(props.element)

  const copyUrl = target?.dataset.reference
  return (
    <EditorHoveringActions
      onCopyLink={copyUrl ? () => copyUrl : undefined}
      onComment={props.onComment}
      copyLabel="block"
      css={{
        transform: `translate(105%, ${topOffset})`,
        position: 'absolute',
        top: 0,
        right: -60,
        zIndex: '$4',
      }}
    />
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
    mode: editor.mode,
    element,
  }
}

function useTopOffset(element: BlockData['element']) {
  return useMemo(() => {
    if (!element) return '0'

    let values = {
      [ELEMENT_STATEMENT]: '0.5rem',
      [ELEMENT_HEADING]: element[1].length == 2 ? '0.6rem' : '0.4rem',
      [ELEMENT_BLOCKQUOTE]: '1.5rem',
      [ELEMENT_CODE]: '1.3rem',
    }
    let type = element[0].type

    return values[type] || '1rem'
  }, [element])
}

var items: {
  [key: string]: Array<{
    label: string
    iconName: keyof typeof icons
    onSelect: ReturnType<typeof insertInline | typeof setList>
  }>
} = {
  'Insert inline': [
    {
      label: 'Image',
      iconName: 'Image',
      onSelect: insertInline(image),
    },
    {
      label: 'Video',
      iconName: 'Video',
      onSelect: insertInline(video),
    },
  ],
  'Turn Block into': [
    {
      label: 'Heading',
      iconName: 'Heading',
      onSelect: setType(heading),
    },
    {
      label: 'Statement',
      iconName: 'Paragraph',
      onSelect: setType(statement),
    },
    {
      label: 'Blockquote',
      iconName: 'Quote',
      onSelect: setType(blockquote),
    },
    {
      label: 'Code block',
      iconName: 'Code',
      onSelect: setType(code),
    },
  ],
  'Turn group into': [
    {
      label: 'Bullet List',
      iconName: 'BulletList',
      onSelect: setList(ul),
    },
    {
      label: 'Ordered List',
      iconName: 'OrderedList',
      onSelect: setList(ol),
    },
    {
      label: 'Plain List',
      iconName: 'List',
      onSelect: setList(group),
    },
  ],
}

export function BlockTools({block}: {block: FlowContent}) {
  const editor = useSlate()
  const route = useNavRoute()

  const blocktoolsProps = useBlocktoolsData(editor)
  const [isCommenting, setIsCommenting] = useState(false)

  let {show, element, mode} = blocktoolsProps

  let Component = toolsByMode[mode] || null

  const docId = route.key === 'publication' ? route.documentId : undefined
  if (mode == EditorMode.Publication && !docId) {
    return null
  }
  if (isCommenting && block.revision && docId) {
    return (
      <BlockCommentForm
        blockId={block.id}
        blockRevision={block.revision}
        docId={docId}
        onBlur={() => {
          setIsCommenting(false)
        }}
      />
    )
  }
  if (show && element && element[0].id == block.id) {
    return (
      <Component
        {...blocktoolsProps}
        onComment={() => {
          setIsCommenting(true)
        }}
      />
    )
  } else {
    return null
  }
}
