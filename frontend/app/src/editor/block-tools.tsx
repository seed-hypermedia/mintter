import {
  useBlockTools,
  useCurrentBlockToolsId,
} from '@app/editor/block-tools-context'
import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {getEditorBlock} from '@app/editor/utils'
import {useFileEditor} from '@app/file-provider'
import {ObjectKeys} from '@app/utils/object-keys'
import {Box} from '@components/box'
import {Icon, icons} from '@components/icon'
import {Text} from '@components/text'
import {
  blockquote,
  code,
  FlowContent,
  group,
  heading,
  image,
  isFlowContent,
  isGroupContent,
  isHeading,
  MttastContent,
  ol,
  statement,
  text,
  ul,
  video,
} from '@mintter/mttast'
import {useActor} from '@xstate/react'
import {Fragment, useMemo} from 'react'
import {BaseRange, Editor, Node, Path, Transforms} from 'slate'
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
  element: FlowContent
}

export function BlockTools() {
  let btService = useBlockTools()
  let [state] = useActor(btService)
  let blockId = useCurrentBlockToolsId()
  let editor = useFileEditor()
  let blockEntry = useMemo(() => {
    if (blockId) {
      return getEditorBlock(editor, {id: blockId})
    }
  }, [blockId])

  let x = state.context.currentPosition
    ? `${state.context.currentPosition.x}px`
    : '-9999px'
  let y = state.context.currentPosition
    ? `${state.context.currentPosition.y}px`
    : '-9999px'

  console.log('🚀 ~ file: block-tools.tsx ~ line 109 ~ BlockTools ~ state', {
    x,
    y,
    currentPosition: state.context.currentPosition,
  })

  return state.matches('active') ? (
    <Box
      css={{
        position: 'absolute',
        zIndex: '$max',
        insetBlockStart: `calc(${y} - 2.5rem)`,
        insetInlineStart: `calc(${x})`,
      }}
    >
      <Dropdown.Root
        modal={false}
        onOpenChange={(isOpen) => {
          btService.send(isOpen ? 'DROPDOWN.OPEN' : 'DROPDOWN.CLOSE')
        }}
      >
        <Dropdown.Trigger asChild>
          <ElementDropdown data-trigger contentEditable={false}>
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
  ) : null
}

/* eslint-disable */
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

/* eslint-disable */
function setList(fn: any) {
  return function wrapWithListType(
    editor: Editor,
    element: MttastContent,
    at: Path,
  ) {
    const list = Node.parent(editor, at)

    if (list && isGroupContent(list)) {
      Editor.withoutNormalizing(editor, () => {
        const {children} = list
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
