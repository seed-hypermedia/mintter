import * as React from 'react'
import addons, {types} from '@storybook/addons'

import {useTheme} from '../../src/use-theme'
import {Box} from '../../src/box'
import {Text} from '../../src/text'

addons.register('mintter/theme', () => {
  addons.add('mintter/theme-toolbar', {
    title: 'Mintter Theme',
    type: types.TOOL,
    match: ({viewMode}) => !!(viewMode && viewMode.match(/^(story|docs)$/)),
    render: props => {
      const {currentTheme, toggle} = useTheme()

      return (
        <Box css={{display: 'flex', alignItems: 'center'}}>
          <Text variant="ui-tiny" css={{color: '$palette-gray-900'}}>
            Dark Mode
          </Text>
          <input
            type="checkbox"
            checked={currentTheme === 'dark'}
            onChange={toggle}
          />
        </Box>
      )
    },
  })
})
