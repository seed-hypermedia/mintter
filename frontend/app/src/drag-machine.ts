import {invoke} from '@tauri-apps/api'
import {listen, UnlistenFn} from '@tauri-apps/api/event'
import {Path} from 'slate'
import {assign, createMachine} from 'xstate'

type Block = [id: string, path: Path]

type DragContext = {
  fromPath: Path | null
  toPath: Path | null
}

type DragEvent =
  | {type: 'DRAG.START'; fromPath: Path}
  | {type: 'DROPPED'}
  | {type: 'DRAG.OVER'; toPath: Path}

export var dragMachine =
  /** @xstate-layout N4IgpgJg5mDOIC5QQE4EMoFoC2aDGAFgJYB2YAdKfgC5EBuYAxACIBKAggOLkDKAKu1Z8A2gAYAuolAAHAPawitWSSkgAHogAsAJlHkAnADYAHAHZDAVm0Wzx-aMMAaEAE9EAZgCMm8p8PfDbW9jUXcHTQBfCOdUDBx8YjJyGnomNgB5AAVMgFFmMUkkEDkFJRUijQRNQ0NyTVMLUU93U3dtfU8mp1dEIL0w0UGwi08G02MomPQsXEJSClhqWWlpSEZWHJ4ckQlVEsUiZVVK0dNydzNGzQtTc3dDU21nNwQW4zqWxouA-UfTSZAsRmCXm5EWy1WEEYakWaGoFDQADN4SgABS6QYASkYQPicyS4JWkAKe3kByOFUQp3Ol1E11uhnuj2eHi85Cal2GoxuEwBJFkEDgqlxs0SYFJpUO5VAlUw3RecoBIpBSSoeFoDAl5Ol6g8g3INk82kMDmMnk8VncmhZrxa5G092qnVCgQCSumeLFyXVqS1ZWOiBNen0nwt1lsHRtQXexhNmk8dgsFk0xka2ndcVFoMJkL9UoDVSePQQQX0vkag209X0Sba6aiESAA */
  createMachine(
    {
      predictableActionArguments: true,
      context: {fromPath: null, toPath: null},
      schema: {context: {} as DragContext, events: {} as DragEvent},
      tsTypes: {} as import('./drag-machine.typegen').Typegen0,
      // invoke: [
      //   {
      //     src: 'dragListener',
      //     id: 'dragListener',
      //   },
      // ],
      id: 'drag-machine',
      description: 'empty',
      initial: 'inactive',
      states: {
        inactive: {
          on: {
            'DRAG.START': {
              actions: ['setFromPath'],
              target: 'active',
            },
          },
          entry: ['resetPaths'],
        },
        active: {
          on: {
            DROPPED: {
              actions: ['performMove'],
              target: 'inactive',
            },
            'DRAG.OVER': {
              actions: ['setToPath'],
            },
          },
        },
      },
    },
    {
      actions: {
        setFromPath: assign({
          fromPath: (context, event) => {
            return event.fromPath
          },
        }),
        setToPath: assign({
          toPath: (context, event) => {
            return event.toPath
          },
        }),
        resetPaths: assign({
          fromPath: null,
          toPath: null,
        }),
      },
    },
  )
