import {assign, createMachine, InterpreterFrom} from 'xstate'
import {darkTheme, lightTheme} from './stitches.config'
import {createInterpreterContext} from './utils/machine-utils'

const [ThemeProvider, useTheme, createThemeSelector] =
  createInterpreterContext<
    InterpreterFrom<ReturnType<typeof createThemeService>>
  >('Theme')

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

export function createThemeService() {
  return createMachine(
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
      invoke: {
        src: 'colorShemeListener',
        id: 'colorShemeListener',
      },
      states: {
        loading: {
          invoke: {
            id: 'getPersistedTheme',
            src: 'getPersistedTheme',
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
              actions: ['toggleTheme', 'applyToDom'],
            },
            CHANGE: {
              actions: [
                (_, event) => {
                  console.log('ACTION EVENT', event)
                },
                'assignTheme',
                'applyToDom',
              ],
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
        assignTheme: assign({
          current: (_, event) => event.theme,
        }),
        toggleTheme: assign({
          current: (context, event) =>
            context.current == 'dark' ? 'light' : 'dark',
        }),
      },
      services: {
        colorShemeListener: () => (sendBack) => {
          const darkModeMediaQuery = window.matchMedia(
            '(prefers-color-scheme: dark)',
          )

          darkModeMediaQuery.addEventListener('change', (event) => {
            console.log('CHANGE!', event.matches)

            sendBack({
              type: 'CHANGE',
              theme: event.matches ? 'dark' : 'light',
            })
          })
        },
        getPersistedTheme: () => (sendBack) => {
          const darkModeMediaQuery = window.matchMedia(
            '(prefers-color-scheme: dark)',
          )

          sendBack({
            type: 'REPORT.THEME.SUCCESS',
            theme: darkModeMediaQuery.matches ? 'dark' : 'light',
          })
        },
      },
    },
  )
}
