// this menu is visible on macOS only
// the keyboard shortcuts apply to every platform

import {Menu, MenuItem} from 'electron'
import {dispatchFocusedWindowAppEvent, openRoute, trpc} from './app-api'

export function createAppMenu() {
  const appMenu = new Menu()

  appMenu.append(
    new MenuItem({
      role: 'appMenu',
      label: 'Mintter',
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
            dispatchFocusedWindowAppEvent('openQuickSwitcher')
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
            trpc.createAppWindow({routes: [{key: 'draft'}]})
          },
        },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+Shift+n',
          click: () => {
            trpc.createAppWindow({routes: [{key: 'home'}]})
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
          id: 'route_pubs',
          label: 'Publications',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            openRoute({key: 'home'})
          },
        },
        {
          id: 'route_pubs',
          label: 'All Publications',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            openRoute({key: 'all-publications'})
          },
        },
        {
          id: 'groups',
          label: 'Groups',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            openRoute({key: 'groups'})
          },
        },
        {
          id: 'route_drafts',
          label: 'Drafts',
          accelerator: 'CmdOrCtrl+8',
          click: () => {
            openRoute({key: 'drafts'})
          },
        },
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
