import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  SideMenuProsemirrorPlugin,
} from '@/editor/blocknote/core'
import Tippy from '@tippyjs/react'
import {FC, useEffect, useMemo, useRef, useState} from 'react'
import {DefaultSideMenu} from './DefaultSideMenu'
import {DragHandleMenuProps} from './DragHandleMenu/DragHandleMenu'

export type SideMenuProps<BSchema extends BlockSchema = DefaultBlockSchema> =
  Pick<
    SideMenuProsemirrorPlugin<BSchema>,
    | 'blockDragStart'
    | 'blockDragEnd'
    | 'addBlock'
    | 'freezeMenu'
    | 'unfreezeMenu'
  > & {
    block: Block<BSchema>
    editor: BlockNoteEditor<BSchema>
    dragHandleMenu?: FC<DragHandleMenuProps<BSchema>>
  }

export const SideMenuPositioner = <
  BSchema extends BlockSchema = DefaultBlockSchema,
>(props: {
  editor: BlockNoteEditor<BSchema>
  sideMenu?: FC<SideMenuProps<BSchema>>
  placement?: 'left' | 'right'
}) => {
  const [show, setShow] = useState<boolean>(false)
  const [block, setBlock] = useState<Block<BSchema>>()
  const referencePos = useRef<DOMRect>()
  const [lh, setLh] = useState('')

  useEffect(() => {
    return props.editor.sideMenu.onUpdate((sideMenuState) => {
      setShow(sideMenuState.show)
      setBlock(sideMenuState.block)
      referencePos.current = sideMenuState.referencePos
      setLh(sideMenuState.lineHeight)
    })
  }, [props.editor])

  const getReferenceClientRect = useMemo(
    () => {
      if (!referencePos.current) {
        return undefined
      }

      return () => referencePos.current!
    },
    [referencePos.current], // eslint-disable-line
  )

  const sideMenuElement = useMemo(() => {
    if (!block) {
      return null
    }

    const SideMenu = props.sideMenu || DefaultSideMenu

    return (
      <SideMenu
        block={block}
        editor={props.editor}
        blockDragStart={props.editor.sideMenu.blockDragStart}
        blockDragEnd={props.editor.sideMenu.blockDragEnd}
        addBlock={props.editor.sideMenu.addBlock}
        freezeMenu={props.editor.sideMenu.freezeMenu}
        unfreezeMenu={props.editor.sideMenu.unfreezeMenu}
      />
    )
  }, [block, props.editor, props.sideMenu])

  let topOffset = useMemo(() => {
    if (block && referencePos.current) {
      let lhValue = parseInt(lh, 10)

      switch (block.type) {
        case 'paragraph':
        case 'heading':
          return (referencePos?.current?.height / 2) * -1 + lhValue
        default:
          return 8
      }
    } else {
      return 8
    }
  }, [referencePos.current])

  return (
    <Tippy
      appendTo={props.editor.domElement.parentElement!}
      content={sideMenuElement}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={show}
      animation={'fade'}
      offset={[topOffset, 32]}
      placement={props.placement}
      popperOptions={popperOptions}
    />
  )
}
const popperOptions = {
  modifiers: [
    {
      name: 'flip',
      options: {
        fallbackPlacements: [],
      },
    },
    {
      name: 'preventOverflow',
      options: {
        mainAxis: false,
        altAxis: false,
      },
    },
  ],
}
