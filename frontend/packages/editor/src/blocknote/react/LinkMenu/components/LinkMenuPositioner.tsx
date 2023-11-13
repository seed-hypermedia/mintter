import {
    BlockNoteEditor,
    BlockSchema,
    DefaultBlockSchema,
    LinkMenuProsemirrorPlugin,
    LinkMenuState,
    getDefaultLinkMenuItems,
  } from '@/blocknote/core'
  import Tippy from '@tippyjs/react'
  import {FC, useEffect, useMemo, useRef, useState} from 'react'

  import {DefaultLinkMenu} from './DefaultLinkMenu'
  import { LinkMenuItem } from '@/blocknote/core/extensions/LinkMenu/LinkMenuItem'
  
  export type LinkMenuProps<BSchema extends BlockSchema = DefaultBlockSchema> =
    Pick<LinkMenuProsemirrorPlugin<BSchema, any>, 'itemCallback'> &
      Pick<
        LinkMenuState<LinkMenuItem<BSchema>>,
        'items' | 'keyboardHoveredItemIndex'
      >
  
  export const LinkMenuPositioner = <
    BSchema extends BlockSchema = DefaultBlockSchema,
  >(props: {
    editor: BlockNoteEditor<BSchema>
    linkMenu?: FC<LinkMenuProps<BSchema>>
  }) => {
    const [show, setShow] = useState<boolean>(false)
    const [ref, setRef] = useState<string>('')
    const items = getDefaultLinkMenuItems<BSchema>()
    const [keyboardHoveredItemIndex, setKeyboardHoveredItemIndex] =
      useState<number>()
    const scroller = useRef<HTMLElement | null>(null)
  
    const referencePos = useRef<DOMRect>()
    useEffect(() => {
      setTimeout(() => {
        scroller.current = document.getElementById('scroll-page-wrapper')
      }, 100)
    }, [])
  
    useEffect(() => {
      return props.editor.linkMenu.onUpdate((linkMenuState) => {
        setShow(linkMenuState.show)
        setRef(linkMenuState.ref)
        setKeyboardHoveredItemIndex(linkMenuState.keyboardHoveredItemIndex)
  
        referencePos.current = linkMenuState.referencePos
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
  
    const linkMenuElement = useMemo(() => {
      if (keyboardHoveredItemIndex === undefined) {
        return null
      }
  
      const LinkMenu = props.linkMenu || DefaultLinkMenu
  
      return (
        <LinkMenu
          items={items}
          itemCallback={(item) => props.editor.linkMenu.itemCallback(item, ref)}
          keyboardHoveredItemIndex={keyboardHoveredItemIndex}
        />
      )
    }, [keyboardHoveredItemIndex, props.editor.linkMenu, props.linkMenu, ref], // eslint-disable-line
    )
  
    return (
      <Tippy
        appendTo={scroller.current!}
        content={linkMenuElement}
        getReferenceClientRect={getReferenceClientRect}
        interactive={true}
        visible={show}
        animation={'fade'}
        placement={'bottom-start'}
      />
    )
  }
  