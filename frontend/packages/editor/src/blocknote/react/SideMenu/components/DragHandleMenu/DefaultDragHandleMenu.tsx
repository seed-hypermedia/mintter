import {BlockSchema} from '@/blocknote/core'

import {RemoveBlockButton} from './DefaultButtons/RemoveBlockButton'
import {DragHandleMenu, DragHandleMenuProps} from './DragHandleMenu'
import {useCallback, useRef, useState} from 'react'
import {DragHandleMenuItem} from './DragHandleMenuItem'
import {Menu, Box} from '@mantine/core'
import {BlockTypeDropdown} from '@/blocknote/react/FormattingToolbar/components/DefaultDropdowns/BlockTypeDropdown'
import {HiChevronRight} from 'react-icons/hi'
import {Forward, SizableText, XStack} from '@mintter/ui'
import {RiHeading, RiListOrdered, RiListUnordered, RiText} from 'react-icons/ri'
import {BlockNoteEditor, HMBlockSchema} from '@/index'
import {updateGroup} from '@/block-utils'

export const DefaultDragHandleMenu = <BSchema extends HMBlockSchema>(
  props: DragHandleMenuProps<BSchema>,
) => (
  <DragHandleMenu>
    <RemoveBlockButton {...props}>Delete</RemoveBlockButton>
    <TurnIntoMenu {...props} />
  </DragHandleMenu>
)

function TurnIntoMenu(props: DragHandleMenuProps<HMBlockSchema>) {
  console.log(`== ~ TurnIntoMenu ~ props:`, props)
  const [opened, setOpened] = useState(false)

  const menuCloseTimer = useRef<NodeJS.Timeout | undefined>()

  const startMenuCloseTimer = useCallback(() => {
    if (menuCloseTimer.current) {
      clearTimeout(menuCloseTimer.current)
    }
    menuCloseTimer.current = setTimeout(() => {
      setOpened(false)
    }, 250)
  }, [])

  const stopMenuCloseTimer = useCallback(() => {
    if (menuCloseTimer.current) {
      clearTimeout(menuCloseTimer.current)
    }
    setOpened(true)
  }, [])

  if (!props.block.type) {
    return null
  }

  return (
    <DragHandleMenuItem
      onMouseOver={stopMenuCloseTimer}
      onMouseLeave={startMenuCloseTimer}
    >
      <Menu opened={opened} position="right">
        <Menu.Target>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <div style={{flex: 1}}>Turn into</div>
            <Box style={{display: 'flex', alignItems: 'center'}}>
              <Forward size={12} />
            </Box>
          </div>
        </Menu.Target>
        <Menu.Dropdown
          onMouseLeave={startMenuCloseTimer}
          onMouseOver={stopMenuCloseTimer}
          style={{marginLeft: '5px'}}
        >
          {turnIntoItems.map(({Icon, label, onClick}) => (
            <Menu.Item
              key={label}
              onClick={() => {
                onClick(props)
              }}
              component="div"
              icon={<Icon size={12} />}
            >
              {label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </DragHandleMenuItem>
  )
}

var turnIntoItems = [
  {
    label: 'Paragraph',
    Icon: RiText,
    onClick: ({
      block,
      editor,
    }: {
      block: BlockNoteEditor<HMBlockSchema>
      editor: BlockNoteEditor<HMBlockSchema>
    }) => {
      editor.focus()
      editor.updateBlock(block, {
        type: 'paragraph',
        props: {},
      })
    },
  },
  {
    label: 'Heading',
    Icon: RiHeading,
    onClick: ({
      block,
      editor,
    }: {
      block: BlockNoteEditor<HMBlockSchema>
      editor: BlockNoteEditor<HMBlockSchema>
    }) => {
      editor.focus()
      editor.updateBlock(block, {
        type: 'heading',
        props: {},
      })
    },
  },
  {
    label: 'Bullet item',
    Icon: RiListUnordered,
    onClick: ({
      block,
      editor,
    }: {
      block: BlockNoteEditor<HMBlockSchema>
      editor: BlockNoteEditor<HMBlockSchema>
    }) => {
      editor.focus()
      updateGroup(editor, block, 'ul')
    },
  },
  {
    label: 'Numbered item',
    Icon: RiListOrdered,
    onClick: ({
      block,
      editor,
    }: {
      block: BlockNoteEditor<HMBlockSchema>
      editor: BlockNoteEditor<HMBlockSchema>
    }) => {
      editor.focus()
      updateGroup(editor, block, 'ol')
    },
  },
]
