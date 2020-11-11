import React from 'react'
import {
  MenuButton,
  MenuItem as ReakitMenuItem,
  Menu,
  useMenuState,
} from 'reakit/Menu'
import {Portal} from 'reakit/Portal'
import {useBlockMenu} from '../BlockPlugin/components/blockMenuContext'
import {Icons} from './icons'

export function BlockControls({show = false}) {
  const menu = useMenuState({loop: true})
  const {
    state: {blockId, menu: menuItems},
  } = useBlockMenu()

  React.useEffect(() => {
    if (!blockId) {
      menu.hide()
    }
  }, [blockId, menu])

  return (
    <>
      <MenuButton {...menu} className="rounded bg-white shadow-sm p-1">
        <Icons.MoreHorizontal size={16} />
      </MenuButton>
      {show && (
        <Portal>
          <Menu
            {...menu}
            aria-label="Block Menu"
            style={{width: 320, zIndex: 1000, backgroundColor: 'white'}}
          >
            {menuItems.map(item => (
              <MenuItem key={item.label} {...menu}>
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </Portal>
      )}
    </>
  )
}

function MenuItem({className = '', ...props}: any) {
  return (
    <ReakitMenuItem
      {...props}
      className={`w-full px-2 py-2 focus:bg-info text-sm text-left disabled:opacity-50 flex items-center ${className}`}
    />
  )
}
