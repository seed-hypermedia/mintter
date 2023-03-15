import {useDrag} from '@app/drag-context'
import {ELEMENT_BLOCKQUOTE} from '@app/editor/blockquote'
import {ELEMENT_CODE} from '@app/editor/code'
import {ElementDropdown} from '@app/editor/dropdown'
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
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon, icons} from '@components/icon'
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
import {useSelector} from '@xstate/react'
import {MouseEvent, useMemo} from 'react'
import toast from 'react-hot-toast'
import {Editor, NodeEntry} from 'slate'
import {ReactEditor, useSlate} from 'slate-react'
import './styles/blocktools.scss'

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
  let topOffset = useTopOffset(props.element)

  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
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
        transform: `translate(-34px, ${topOffset})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '$3',
      }}
      onMouseDown={onMouseDown}
      onMouseUp={() => mouseService.send('DISABLE.DRAG.END')}
    >
      <ElementDropdown data-testid="blocktools-trigger">
        <Icon name="Grid4" color="muted" />
      </ElementDropdown>
      {/* <Dropdown.Root
        onOpenChange={(isOpen) => {
          mouseService.send(
            isOpen ? 'DISABLE.BLOCKTOOLS.OPEN' : 'DISABLE.BLOCKTOOLS.CLOSE',
          )
        }}
      >
        <Dropdown.Trigger asChild>
          <ElementDropdown data-testid="blocktools-trigger">
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
      </Dropdown.Root> */}
    </Box>
  )
}

function PublicationBlocktools(
  props: BlockData & {copy?: typeof copyTextToClipboard},
) {
  let target = useCurrentTarget()
  let blockId = useMemo(() => {
    if (!props.element) return null
    return props.element[0].id
  }, [props.element])

  let localCopy = props.copy ?? copyTextToClipboard

  function handleCopy() {
    let reference = target?.dataset.reference
    if (reference) {
      localCopy(reference)
      toast.success('copied block!')
    }
  }

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

  return (
    <Box
      contentEditable={false}
      css={{
        // width: 30,
        height: 24,
        position: 'absolute',
        top: 0,
        right: -60,
        zIndex: '$4',
        transform: `translate(105%, ${topOffset})`,
      }}
    >
      <Button
        variant="ghost"
        color="primary"
        size="1"
        onClick={handleCopy}
        css={{
          background: '$base-background-normal',
          display: 'flex',
          alignItems: 'center',
          gap: '$2',
          '&:hover': {
            background: '$base-background-normal',
          },
        }}
      >
        <Icon name="Copy" /> <span>{blockId}</span>
      </Button>
    </Box>
  )
}

type BlockData = {
  mouseService: MouseInterpret
  editor: Editor
  show: boolean
  mode: EditorMode
  element?: NodeEntry<FlowContent>
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
  const blocktoolsProps = useBlocktoolsData(editor)

  let {show, element, mode} = blocktoolsProps

  let Component = toolsByMode[mode] || null

  if (show && element && element[0].id == block.id) {
    return <Component {...blocktoolsProps} />
  } else {
    return null
  }
}
