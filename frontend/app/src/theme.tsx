import {store} from '@app/client/store'
import {assign, createMachine, InterpreterFrom} from 'xstate'
import {darkTheme, lightTheme} from './stitches.config'
import {createInterpreterContext} from './utils/machine-utils'

const [ThemeProvider, useTheme, createThemeSelector] =
  createInterpreterContext<InterpreterFrom<typeof themeMachine>>('Theme')

export {ThemeProvider, useTheme}

export const useCurrentTheme = createThemeSelector(
  (state) => state.context.current,
)
export const useOppositeTheme = createThemeSelector((state) =>
  state.context.current == 'dark' ? 'light' : 'dark',
)

type keys = 'light' | 'dark'

let theme = {
  light: lightTheme,
  dark: darkTheme,
}

type ThemeContextType = {
  current: keys
}

type ThemeEvent =
  | {type: 'CHANGE'; theme: keys}
  | {type: 'TOGGLE'}
  | {type: 'REPORT.THEME.SUCCESS'; theme: keys}

export let themeMachine = createMachine(
  {
    tsTypes: {} as import('./theme.typegen').Typegen0,
    schema: {
      context: {} as ThemeContextType,
      events: {} as ThemeEvent,
    },
    context: {
      current: 'light',
    },
    initial: 'loading',
    states: {
      loading: {
        invoke: {
          id: 'get-persisted-theme',
          src: () => (sendBack) => {
            store
              .get<keys>('theme')
              .then((theme: keys | null) => {
                theme = theme ?? 'light'

                sendBack({type: 'REPORT.THEME.SUCCESS', theme})
              })
              .catch(() => {
                sendBack({type: 'CHANGE', theme: 'light'})
              })
          },
        },
        on: {
          'REPORT.THEME.SUCCESS': {
            target: 'ready',
            actions: ['assignTheme', 'applyToDom'],
          },
        },
      },
      ready: {
        on: {
          TOGGLE: {
            actions: ['toggleTheme', 'applyToDom', 'persist'],
          },
          CHANGE: {
            actions: ['assignTheme', 'applyToDom', 'persist'],
          },
        },
      },
    },
  },
  {
    actions: {
      applyToDom: (context) => {
        let opposite: keys = context.current == 'dark' ? 'light' : 'dark'
        if (window) {
          window.document.body.classList.remove(
            theme[opposite],
            theme[context.current],
          )
          window.document.body.classList.add(theme[context.current])
        }
      },
      persist: (context) => {
        try {
          store.set('theme', context.current)
        } catch (e) {
          console.error(e)
        }
      },
      assignTheme: assign({
        current: (_, event) => event.theme,
      }),
      toggleTheme: assign({
        current: (context, event) =>
          context.current == 'dark' ? 'light' : 'dark',
      }),
    },
  },
)
