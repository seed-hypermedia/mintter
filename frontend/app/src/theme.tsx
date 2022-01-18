import {InterpreterFrom} from 'xstate'
import {createModel} from 'xstate/lib/model'
import {darkTheme, lightTheme} from './stitches.config'
import {createStore} from './store'
import {createInterpreterContext} from './utils/machine-utils'

const [ThemeProvider, useTheme, createThemeSelector] =
  createInterpreterContext<InterpreterFrom<typeof themeMachine>>('Theme')

export {ThemeProvider, useTheme}

export const useCurrentTheme = createThemeSelector((state) => state.context.current)
export const useOppositeTheme = createThemeSelector((state) => (state.context.current == 'dark' ? 'light' : 'dark'))

const store = createStore('.settings.dat')

type keys = 'light' | 'dark'

let theme = {
  light: lightTheme,
  dark: darkTheme,
}

let themeModel = createModel(
  {
    current: 'light' as keys,
  },
  {
    events: {
      CHANGE: (newTheme: keys) => ({newTheme}),
      TOGGLE: () => ({}),
      'REPORT.THEME.SUCCESS': (theme: keys) => ({theme}),
    },
  },
)

export let themeMachine = themeModel.createMachine(
  {
    context: themeModel.initialContext,
    initial: 'loading',
    states: {
      loading: {
        invoke: {
          id: 'get-persisted-theme',
          src: () => (sendBack) => {
            store
              .get<keys>('theme')
              .then((result: keys | null) => {
                result = result ?? 'light'

                sendBack(themeModel.events['REPORT.THEME.SUCCESS'](result))
              })
              .catch(() => {
                sendBack(themeModel.events['REPORT.THEME.SUCCESS']('light'))
              })
          },
        },
        on: {
          'REPORT.THEME.SUCCESS': {
            target: 'ready',
            actions: [
              themeModel.assign({
                current: (_, event) => (event.theme == 'light' ? 'light' : 'dark'),
              }),
              'applyToDom',
            ],
          },
        },
      },
      ready: {
        on: {
          TOGGLE: {
            actions: [
              themeModel.assign({
                current: (context) => (context.current == 'light' ? 'dark' : 'light'),
              }),
              'applyToDom',
              'persist',
            ],
          },
          CHANGE: {
            actions: [
              themeModel.assign({
                current: (_, event) => event.newTheme,
              }),
              'applyToDom',
              'persist',
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
          window.document.body.classList.remove(theme[opposite], theme[context.current])
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
    },
  },
)
