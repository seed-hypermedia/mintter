// this menu is visible on macOS only
// the keyboard shortcuts apply to every platform

import {defaultRoute} from '@/utils/routes'
import {Menu, MenuItem} from 'electron'
import {dispatchFocusedWindowAppEvent, openRoute, trpc} from './app-api'

export function createAppMenu() {
  const appMenu = new Menu()

  appMenu.append(
    new MenuItem({
      role: 'appMenu',
      label: 'Seed',
      submenu: [
        {role: 'about'},
        {type: 'separator'},
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            trpc.createAppWindow({routes: [{key: 'settings'}]})
          },
        },
        {
          label: 'Search / Open',
          accelerator: 'CmdOrCtrl+k',
          click: () => {
            dispatchFocusedWindowAppEvent('openLauncher')
          },
        },
        {type: 'separator'},
        {
          label: 'Trigger Sync with Peers',
          accelerator: 'CmdOrCtrl+Option+r',
          click: () => {
            dispatchFocusedWindowAppEvent('triggerPeerSync')
          },
        },
        {type: 'separator'},
        {role: 'services'},
        {type: 'separator'},
        {role: 'hide'},
        {role: 'hideOthers'},
        {role: 'unhide'},
        {type: 'separator'},
        {role: 'quit'},
      ],
    }),
  )
  appMenu.append(
    new MenuItem({
      role: 'fileMenu',
      submenu: [
        {
          label: 'New Document',
          accelerator: 'CmdOrCtrl+n',
          click: () => {
            trpc.createAppWindow({
              routes: [{key: 'draft'}],
              sidebarLocked: false,
            })
          },
        },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+Shift+n',
          click: () => {
            trpc.createAppWindow({routes: [defaultRoute]})
          },
        },
        {type: 'separator'},
        {role: 'close'},
      ],
    }),
  )
  appMenu.append(new MenuItem({role: 'editMenu'}))

  appMenu.append(
    new MenuItem({
      id: 'viewMenu',
      label: 'View',
      submenu: [
        {role: 'reload'},
        {role: 'forceReload'},
        {role: 'toggleDevTools'},
        {type: 'separator'},
        {
          id: 'back',
          label: 'Back',
          accelerator: 'CmdOrCtrl+Left',
          click: () => {
            dispatchFocusedWindowAppEvent('back')
          },
        },
        {
          id: 'forward',
          label: 'Forward',
          accelerator: 'CmdOrCtrl+Right',
          click: () => {
            dispatchFocusedWindowAppEvent('forward')
          },
        },
        {type: 'separator'},
        {
          id: 'route_contacts',
          label: 'Contacts',
          accelerator: 'CmdOrCtrl+9',
          click: () => {
            openRoute({
              key: 'contacts',
            })
          },
        },
        {
          id: 'route_deleted_content',
          label: 'Review Deleted Content',
          // accelerator: 'CmdOrCtrl+9',
          click: () => {
            openRoute({
              key: 'deleted-content',
            })
          },
        },
        {type: 'separator'},
        {role: 'resetZoom'},
        {role: 'zoomIn'},
        {role: 'zoomOut'},
        {type: 'separator'},
        {role: 'togglefullscreen'},
      ],
    }),
  )
  // appMenu.getMenuItemById('route_pubs').enabled = false

  appMenu.append(
    new MenuItem({
      role: 'windowMenu',
      submenu: [
        {
          role: 'minimize',
        },
      ],
    }),
  )

  return appMenu
}
