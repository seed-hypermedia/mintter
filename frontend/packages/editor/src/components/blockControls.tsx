import {SlateBlock} from '../editor'
import React from 'react'
import {
  MenuButton,
  MenuItem as ReakitMenuItem,
  Menu,
  useMenuState,
  MenuSeparator,
} from 'reakit/Menu'
import {Portal} from 'reakit/Portal'
import {useBlockMenu} from '../BlockPlugin/components/blockMenuContext'
import {Icons} from './icons'

export const BlockControls = ({element}: any) => {
  const menu = useMenuState({loop: true})
  const {
    state: {menu: menuItems},
  } = useBlockMenu()

  return menuItems[element.type].length !== 0 ? (
    <>
      <MenuButton {...menu} className="rounded bg-white shadow-sm p-1">
        <Icons.MoreHorizontal size={16} />
      </MenuButton>
      <Portal>
        <Menu
          {...menu}
          aria-label="Block Menu"
          style={{width: 320, zIndex: 1000, backgroundColor: 'white'}}
        >
          {menuItems[element.type].map((item, idx) => {
            if (item.label === 'separator') {
              return <MenuSeparator {...menu} />
            }
            const Icon = item.icon ? item.icon : null
            console.log('BlockControls -> item.menu', item.label, item.menu)
            return item.menu ? (
              <MenuItem
                key={idx}
                {...menu}
                as={SubMenu}
                element={element}
                items={item.menu}
                label={item.label}
                icon={item.icon}
              />
            ) : (
              <MenuItem
                key={idx}
                {...menu}
                onClick={() => item.onClick?.(element)}
              >
                {item.icon && <Icon color="currentColor" size={14} />}
                <span className="flex-1 w-full text-left text-primary mx-2">
                  {item.label}
                </span>
              </MenuItem>
            )
          })}
        </Menu>
      </Portal>
    </>
  ) : null
}

const MenuItem = ({className = '', ...props}: any) => {
  return (
    <ReakitMenuItem
      {...props}
      className={`w-full px-2 py-2 focus:bg-info text-sm text-left disabled:opacity-50 flex items-center ${className}`}
    />
  )
}

const drafts = [
  {
    label: 'draft 1',
    onClick: block => {
      console.log(block)
    },
  },
  {
    label: 'draft 2',
    onClick: block => {
      console.log(block)
    },
  },
  {
    label: 'draft 3',
    onClick: block => {
      console.log(block)
    },
  },
]

const SubMenu = React.forwardRef<
  HTMLDivElement,
  {
    items: any[]
    element: SlateBlock
    label: string
    icon: any
  }
>(({items = [], element, label, icon, ...props}, ref) => {
  const menu = useMenuState({loop: true})
  const LeftIcon = icon ? icon : null
  return (
    <>
      <MenuButton
        ref={ref}
        as="div"
        {...menu}
        {...props}
        className="w-full px-2 py-2 focus:bg-teal-200 text-sm text-left disabled:opacity-50 flex items-center"
      >
        {icon && <LeftIcon color="currentColor" size={14} />}
        <span className="flex-1">{label}</span>
        <Icons.ChevronRight
          size={14}
          color="currentColor"
          className="opacity-75"
        />
      </MenuButton>
      <Portal>
        <Menu {...menu} aria-label="Drafts List selection">
          {drafts.map((item, idx) => {
            if (item.label === 'separator') {
              return <MenuSeparator />
            }
            return (
              <MenuItem
                key={idx}
                {...menu}
                onClick={() => item.onClick?.(element)}
              >
                <span className="flex-1 w-full text-left text-primary mx-2">
                  {item.label}
                </span>
              </MenuItem>
            )
          })}
        </Menu>
      </Portal>
    </>
  )
})
