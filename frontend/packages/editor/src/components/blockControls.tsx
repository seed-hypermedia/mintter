import {SlateBlock} from '../editor'
import React from 'react'
import {
  MenuButton,
  MenuItem as ReakitMenuItem,
  Menu,
  useMenuState,
  MenuSeparator,
} from 'reakit/Menu'
import {useBlockMenu} from '../BlockPlugin/components/blockMenuContext'
import {Icons} from './icons'
// import {isTransclusion} from '../TransclusionPlugin/utils/isTransclusion'

const BlockControlsComp = ({
  disclosure,
  element,
  index,
  highlightedIndex,
}: any) => {
  const menu = useMenuState({loop: true})
  const blockMenuState = useBlockMenu()
  // const isQuote = React.useMemo(() => isTransclusion(element), [element])
  return index === highlightedIndex ? (
    <>
      <MenuButton
        {...menu}
        ref={disclosure.ref}
        {...disclosure.props}
        className="rounded bg-white shadow-sm p-1 block"
      >
        {disclosureProps => React.cloneElement(disclosure, disclosureProps)}
      </MenuButton>
      <Menu
        {...menu}
        aria-label="Block Menu"
        style={{width: 320, zIndex: 100, backgroundColor: 'white'}}
        hideOnClickOutside
      >
        {blockMenuState.onSidePanel && (
          <MenuItem
            {...menu}
            onClick={() => {
              blockMenuState.onSidePanel?.(element.id)
            }}
          >
            <Icons.ArrowUpRight size={16} color="currentColor" />
            <span className="flex-1 mx-2">Open in Sidepanel</span>
          </MenuItem>
        )}
        <MenuItem
          {...menu}
          as={DraftsMenu}
          label="Quote this Block"
          icon={Icons.CornerDownLeft}
          element={element}
        />
        {/* <MenuItem
          {...menu}
          disabled={isQuote}
          onClick={() => {
            menu.hide()
            onQuote?.({block: element})
          }}
        >
          <Icons.CornerDownLeft size={16} color="currentColor" />
          <span className="flex-1 mx-2">Write About this Block</span>
        </MenuItem> */}
      </Menu>
    </>
  ) : null
}

export const BlockControls = React.memo<any>(
  BlockControlsComp,
  (prevProps, nextProps) => {
    if (prevProps.disclosure !== nextProps.disclosure) return false
    if (prevProps.element !== nextProps.element) return false
    if (prevProps.index !== nextProps.index) return false

    if (prevProps.highlightedIndex !== nextProps.highlightedIndex) {
      const wasPrevHighlighted = prevProps.highlightedIndex === prevProps.index
      const isNowHighlighted = nextProps.highlightedIndex === nextProps.index
      return wasPrevHighlighted === isNowHighlighted
    }

    return true
  },
)

const MenuItem = React.memo(({className = '', ...props}: any) => {
  return (
    <ReakitMenuItem
      {...props}
      className={`w-full px-2 py-2 focus:bg-info text-sm text-left disabled:opacity-50 flex items-center ${className}`}
    />
  )
})

const DraftsMenuComp = React.forwardRef<
  HTMLDivElement,
  {
    element: SlateBlock
    label: string
    icon: any
  }
>(({element, label, icon, ...props}, ref) => {
  const menu = useMenuState({loop: true})
  const LeftIcon = icon ? icon : null
  const {drafts = [], onQuote} = useBlockMenu()
  return (
    <>
      <MenuButton
        {...menu}
        {...props}
        className="w-full px-2 py-2 focus:bg-muted text-sm text-left disabled:opacity-50 flex items-center"
        as="div"
        ref={ref}
      >
        {icon && <LeftIcon color="currentColor" size={16} />}
        <span className="flex-1 mx-2">{label}</span>
        <Icons.ChevronRight
          size={14}
          color="currentColor"
          className="opacity-75"
        />
      </MenuButton>
      <Menu
        {...menu}
        aria-label="Drafts List selection"
        style={{width: 320, zIndex: 101, backgroundColor: 'white'}}
      >
        <MenuItem
          {...menu}
          onClick={() => {
            menu.hide()
            onQuote?.({block: element})
            console.log(`onQuote to New Draft = `, onQuote, element)
          }}
        >
          <Icons.PlusCircle size={16} color="currentColor" />
          <span className="flex-1 mx-2">Quote in New Draft</span>
        </MenuItem>
        <MenuSeparator {...menu} style={{margin: 0, padding: 0}} />
        {drafts.map(item => (
          <MenuItem
            key={item.version}
            {...menu}
            onClick={() => {
              menu.hide()
              onQuote?.({block: element, destination: item})
              console.log(`onQuote to ${item.title} = `, onQuote, element)
            }}
          >
            <span className="flex-1 w-full text-left text-primary mx-2">
              {item.title || 'Untitled Document'}
            </span>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
})

export const DraftsMenu = React.memo(DraftsMenuComp)
