import {globalStyles} from '@src/stitches.config'

globalStyles()

const parameters = {
  actions: {argTypesRegex: '^on[A-Z].*'},
  options: {
    storySort: {
      order: [
        'Overview',
        ['Introduction', 'Getting Started', 'Theme'],
        'Components',
        ['Layout', ['Box']],
        ['Data Display', ['Text']],
      ],
    },
  },
}

export {parameters}
