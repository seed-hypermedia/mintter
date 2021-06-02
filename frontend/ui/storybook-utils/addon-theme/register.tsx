import addons, { types } from '@storybook/addons'

import { Box } from '../../src/box'
import { Text } from '../../src/text'
import { useTheme } from '../../src/theme'

addons.register('mintter/theme', () => {
  addons.add('mintter/theme-toolbar', {
    title: 'Mintter Theme',
    type: types.TOOL,
    match: ({ viewMode }) => !!(viewMode && viewMode.match(/^(story|docs)$/)),
    render: () => {
      const { currentTheme, toggle } = useTheme()

      return (
        <Box css={{ display: 'flex', alignItems: 'center' }}>
          <Text size="1" css={{ color: '$palette-gray-900' }}>
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
