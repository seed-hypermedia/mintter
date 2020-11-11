import React from 'react'
import {
  // useEditor,
  useReadOnly,
} from 'slate-react'
// import {useTransclusionHelper} from '../TransclusionPlugin/TransclusionHelperContext'
import {css} from 'emotion'
import {MenuButton, MenuItem, Menu, useMenuState} from 'reakit/Menu'
import {Portal} from 'reakit/Portal'
import {useBlockMenu} from '../BlockPlugin/components/blockMenuContext'

export function BlockControls({show, path, element, dragRef, className = ''}) {
  console.log('BlockControls -> element', element, dragRef, path)
  const readOnly = useReadOnly()
  const menu = useMenuState()
  const {
    state: {menu: menuItems},
  } = useBlockMenu()

  return (
    <div
      className={`absolute ${css`
        transform: translateX(-100%);
        left: -14px;
      `} ${
        readOnly ? '' : 'grid-flow-col-dense grid gap-2 grid-cols-2'
      } transition duration-200 ${
        show ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      contentEditable={false}
    >
      <MenuButton
        {...menu}
        // onClick={readOnly ? onTranscludeClicked : undefined}

        className="rounded-sm text-body hover:bg-muted flex p-1 mt-1 items-center justify-center"
        // ref={readOnly ? null : dragRef}
      >
        <svg viewBox="0 0 16 24" width="12px">
          <path
            d="M3.5 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM14 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM12.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM14 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3.5 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
            fill="currentColor"
          />
        </svg>
      </MenuButton>
      <Portal>
        <Menu
          {...menu}
          aria-label="Block Menu"
          style={{width: 320, zIndex: 1000, backgroundColor: 'pink'}}
        >
          {menuItems.map(item => (
            <MenuItem key={item.label} {...menu}>
              {item.label}
            </MenuItem>
          ))}
        </Menu>
      </Portal>
      {!readOnly && (
        <button className="rounded-sm text-body hover:bg-background-muted flex p-1 mt-1 items-center justify-center">
          <svg viewBox="0 0 16 16" width="16px" fill="none">
            <path
              d="M12.667 8.667h-4v4H7.334v-4h-4V7.334h4v-4h1.333v4h4v1.333z"
              fill="currentColor"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
