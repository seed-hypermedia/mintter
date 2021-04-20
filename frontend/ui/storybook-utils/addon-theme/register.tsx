import addons, {types} from '@storybook/addons'
import * as React from 'react'

import {Box} from '../../src/box'
import {Text} from '../../src/text'
import {useTheme} from '../../src/theme'

addons.register('mintter/theme', () => {
  addons.add('mintter/theme-toolbar', {
    title: 'Mintter Theme',
    type: types.TOOL,
    match: ({viewMode}) => !!(viewMode && viewMode.match(/^(story|docs)$/)),
    render: function Toolbar() {
      const {currentTheme, toggle} = useTheme()

      return (
        <Box css={{display: 'flex', alignItems: 'center'}}>
          <Text size="1" css={{color: '$palette-gray-900'}}>
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
