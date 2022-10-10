import {ELEMENT_BLOCKQUOTE} from '@app/editor/blockquote'
import {ELEMENT_CODE} from '@app/editor/code'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {ELEMENT_HEADING} from '@app/editor/heading'
import {EditorMode} from '@app/editor/plugin-utils'
import {ELEMENT_STATEMENT} from '@app/editor/statement'
import {getEditorBlock, insertInline, setList, setType} from '@app/editor/utils'
import {useFileEditor} from '@app/file-provider'
import {
  MouseInterpret,
  useCurrentBound,
  useCurrentTarget,
  useMouse,
} from '@app/mouse-context'
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
} from '@app/mttast'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon, icons} from '@components/icon'
import {Text} from '@components/text'
import {useSelector} from '@xstate/react'
import {Fragment, ReactNode, useMemo} from 'react'
import toast from 'react-hot-toast'
import {Editor, NodeEntry} from 'slate'
import './styles/blocktools.scss'

let toolsByMode = {
  [EditorMode.Draft]: DraftBlocktools,
  [EditorMode.Publication]: PublicationBlocktools,
  [EditorMode.Discussion]: () => null,
  [EditorMode.Embed]: () => null,
  [EditorMode.Mention]: () => null,
}

export function Blocktools({children}: {children: ReactNode}) {
  let blocktoolsOptions = useBlocktoolsData()
  let Component = toolsByMode[blocktoolsOptions.mode] || null
  return (
    <>
      {blocktoolsOptions.show ? (
        <div
          className="blocktools-wrapper"
          style={{
            '--top': blocktoolsOptions.top,
            '--height': blocktoolsOptions.height,
          }}
        />
      ) : null}
      {children}
      {blocktoolsOptions.show && blocktoolsOptions.element ? (
        <Component {...blocktoolsOptions} />
      ) : null}
    </>
  )
}

function DraftBlocktools(props: BlockData) {
  let {mouseService, element} = props
  let target = useCurrentTarget()
  let leftOffset = useMemo(() => {
    if (!target) return '-2rem'

    let values = {
      group: '-1.5rem',
      unorderedList: '-2.7rem',
      orderedList: '-3rem',
    }

    let {dataset} = target

    return values[dataset.parentGroup]
  }, [target])

  let topOffset = useTopOffset(element)

  return (
    <Box
      className="blocktools"
      css={{
        top: `calc(${props.top} - 40px)`,
        left: `calc(${props.left} + ${leftOffset})`,
        transform: `translateY(${topOffset})`,
      }}
    >
      <Dropdown.Root
        modal={false}
        onOpenChange={(isOpen) => {
          mouseService.send(
            isOpen ? 'DISABLE.BLOCKTOOLS.OPEN' : 'DISABLE.BLOCKTOOLS.CLOSE',
          )
        }}
      >
        <Dropdown.Trigger asChild>
          <ElementDropdown
            data-testid="blocktools-trigger"
            contentEditable={false}
          >
            <Icon name="Grid4" color="muted" />
          </ElementDropdown>
        </Dropdown.Trigger>
        <Dropdown.Portal>
          <Dropdown.Content>
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
                        if (props.element) {
                          props.mouseService.send('DISABLE.CHANGE')
                          item.onSelect(props.editor, {
                            element: props.element[0],
                            at: props.element[1],
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
    let highlight = target?.dataset.highlight
    if (highlight) {
      localCopy(highlight)
      toast.success('copied block!')
    }
  }

  return (
    <Box
      className="blocktools"
      css={{
        top: `calc(${props.top} - 40px)`,
        right: '0.5em',
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
  top: string
  height: string
  left: string
}

function useBlocktoolsData(): BlockData {
  let mouseService = useMouse()
  let editor = useFileEditor()
  let [id, rect] = useCurrentBound() || []

  let element = useMemo(
    () =>
      getEditorBlock(editor, {
        id,
      }),
    [id, editor],
  )

  let show = useSelector(mouseService, (state) => state.matches('active'))

  return {
    mouseService,
    editor,
    show,
    mode: editor.mode,
    element,
    top: rect ? `calc(${rect.top} * 1px)` : '-999px',
    height: rect
      ? `calc(calc(${rect.bottom - rect.top} * 1px) + 1rem)`
      : '-999px',
    left: rect ? `calc(${rect.left} * 1px)` : '0',
  }
}

function useTopOffset(element: BlockData['element']) {
  return useMemo(() => {
    if (!element) return '0'

    let values = {
      [ELEMENT_STATEMENT]: '0.1rem',
      [ELEMENT_HEADING]: element[1].length == 2 ? '0.6rem' : '0.4rem',
      [ELEMENT_BLOCKQUOTE]: '0.5rem',
      [ELEMENT_CODE]: '1.3rem',
      callout: '0',
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
