import {
  useBlockTools,
  useCurrentBlockToolsId,
} from '@app/editor/block-tools-context'
import {blockToolsMachine} from '@app/editor/block-tools-machine'
import {useHover} from '@app/editor/hover-context'
import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {EditorMode} from '@app/editor/plugin-utils'
import {getEditorBlock} from '@app/editor/utils'
import {useFile, useFileEditor, useFileIds} from '@app/file-provider'
import {
  blockquote,
  code,
  FlowContent,
  group,
  heading,
  image,
  isBlockquote,
  isFlowContent,
  isGroupContent,
  isHeading,
  MttastContent,
  ol,
  statement,
  text,
  ul,
  video,
} from '@app/mttast'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {ObjectKeys} from '@app/utils/object-keys'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon, icons} from '@components/icon'
import {Text} from '@components/text'
import {useActor} from '@xstate/react'
import {Fragment, useMemo} from 'react'
import toast from 'react-hot-toast'
import {BaseRange, Editor, Node, NodeEntry, Path, Transforms} from 'slate'
import {InterpreterFrom} from 'xstate'
import {Dropdown, ElementDropdown} from './dropdown'
import {ELEMENT_PARAGRAPH} from './paragraph'

const items: {
  [key: string]: Array<{
    label: string
    iconName: keyof typeof icons
    onSelect: (
      editor: Editor,
      element: FlowContent,
      at: Path,
      lastSelection: BaseRange | null,
    ) => void
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
      iconName: 'MessageBubble',
      onSelect: setType(blockquote),
    },
    {
      label: 'Code block',
      iconName: 'AddCircle',
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

type BlockToolsProps = {
  mode: EditorMode
  isEditing: boolean
}

export function BlockTools(props: BlockToolsProps) {
  let editor = useFileEditor()
  let blocktoolsService = useBlockTools()
  let [state] = useActor(blocktoolsService)
  let blockId = useCurrentBlockToolsId()
  let blockEntry = useMemo(() => {
    if (blockId) {
      return getEditorBlock(editor, {id: blockId})
    }
  }, [blockId, editor])

  if (state.matches('active')) {
    return !props.isEditing && props.mode == EditorMode.Draft ? (
      <DraftBlockTools
        editor={editor}
        blockEntry={blockEntry}
        service={blocktoolsService}
      />
    ) : props.mode == EditorMode.Publication ? (
      <PublicationBlockTools
        editor={editor}
        service={blocktoolsService}
        blockId={state.context.currentId}
      />
    ) : null
  }

  return null
}

type DraftBlockToolsProps = {
  editor: Editor
  service: InterpreterFrom<typeof blockToolsMachine>
  blockEntry?: NodeEntry<FlowContent>
}

export function DraftBlockTools({
  editor,
  service,
  blockEntry,
}: DraftBlockToolsProps) {
  let blockOffset = useMemo(() => {
    if (blockEntry) {
      let [block] = blockEntry

      return isHeading(block)
        ? '1rem'
        : isBlockquote(block)
        ? '1.3rem'
        : '0.7rem'
    } else {
      return '-999rem'
    }
  }, [blockEntry])

  return (
    <Box
      css={{
        position: 'absolute',
        zIndex: '$max',
        insetBlockStart: `calc(calc(var(--tools-y, -999) * 1px) + ${blockOffset})`,
        insetInlineStart: 'calc(calc(var(--tools-x, -999) * 1px) - 1.5rem)',
      }}
    >
      <Dropdown.Root
        modal={false}
        onOpenChange={(isOpen) => {
          service.send(isOpen ? 'DROPDOWN.OPEN' : 'DROPDOWN.CLOSE')
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
        <Dropdown.Content portalled align="start" side="bottom">
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
                      if (blockEntry) {
                        item.onSelect(
                          editor,
                          blockEntry[0],
                          blockEntry[1],
                          editor.selection,
                        )
                      }
                      // item.onSelect(editor, block, path)
                      // item.onSelect(editor, element, path, editor.selection)
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
      </Dropdown.Root>
    </Box>
  )
}

type PublicationBlockToolsProps = {
  editor: Editor
  service: InterpreterFrom<typeof blockToolsMachine>
  blockId?: string
  copy?: typeof copyTextToClipboard
}

export function PublicationBlockTools({
  blockId,
  copy = copyTextToClipboard,
}: PublicationBlockToolsProps) {
  let file = useFile()
  let [docId] = useFileIds()
  let [fileState] = useActor(file)
  let hoverService = useHover()

  async function onCopy() {
    await copy(
      `mtt://${fileState.context.documentId}/${fileState.context.version}/${blockId}`,
    )
    toast.success('Block ID copied successfully', {position: 'top-center'})
  }

  return blockId ? (
    <Box
      css={{
        position: 'absolute',
        zIndex: '$2',
        insetBlockStart: 'calc(calc(var(--tools-y, -999) * 1px) + 0.5rem)',
        insetInlineEnd: 24,
        userSelect: 'none',
        zoom: 0.8,
        backgroundColor: '$base-background-normal',
        '@bp1': {
          zoom: 1,
        },
      }}
      onMouseOver={() => {
        hoverService.send({
          type: 'MOUSE_ENTER',
          ref: `${docId}/${blockId}`,
        })
      }}
    >
      <Button
        size="1"
        color="primary"
        variant="ghost"
        onClick={onCopy}
        css={{display: 'flex', alignItems: 'center', gap: '$3'}}
      >
        <Icon name="Copy" size="1" />
        {blockId}
      </Button>
    </Box>
  ) : null
}

// eslint-disable-next-line
function setType(fn: any) {
  return function setToStatementType(
    editor: Editor,
    element: FlowContent,
    at: Path,
  ) {
    Editor.withoutNormalizing(editor, function () {
      MintterEditor.addChange(editor, ['replaceBlock', element.id])
      const keys = ObjectKeys(element).filter(
        (key) => !['type', 'id', 'children', 'data'].includes(key as string),
      )

      if (isHeading(element)) {
        Transforms.setNodes(editor, {type: ELEMENT_PARAGRAPH}, {at: [...at, 0]})
      }

      if (keys.length) {
        Transforms.unsetNodes(editor, keys, {at})
      }

      // IDs are meant to be stable, so we shouldn't obverride it
      // eslint-disable-next-line
      const {id, ...props} = fn()

      Transforms.setNodes(editor, props, {at})
    })
  }
}

function insertInline(fn: typeof image | typeof video) {
  return function insertInlineElement(
    editor: Editor,
    element: FlowContent,
    selection: typeof editor.selection,
  ) {
    if (selection) {
      MintterEditor.addChange(editor, ['replaceBlock', element.id])
      Transforms.insertNodes(editor, fn({url: ''}, [text('')]), {
        at: selection,
      })
    }
  }
}

// eslint-disable-next-line
function setList(fn: any) {
  return function wrapWithListType(
    editor: Editor,
    element: MttastContent,
    at: Path,
  ) {
    const list = Node.parent(editor, at)

    if (list && isGroupContent(list)) {
      Editor.withoutNormalizing(editor, () => {
        let newList = fn()
        Transforms.setNodes(editor, {type: newList.type}, {at: Path.parent(at)})

        if (at.length == 2) {
          // block is at the root level
        } else {
          let parentBlockEntry = Editor.above(editor, {
            match: isFlowContent,
            at,
          })
          if (parentBlockEntry) {
            let [block] = parentBlockEntry
            MintterEditor.addChange(editor, ['replaceBlock', block.id])
          }
        }
      })
    }
  }
}
