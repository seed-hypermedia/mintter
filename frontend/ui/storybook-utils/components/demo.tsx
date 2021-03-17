import {Box} from '@src/box'
import {styled} from '@src/stitches.config'
import {Text} from '@src/text'
import {Theme} from '@src/theme'

const DemoContainer = styled(Box, {
  backgroundColor: '$background-alt',
  borderRadius: 4,
  boxShadow: 'rgba(100, 100, 111, 0.2) 0px 7px 29px 0px',
  display: 'flex',
  gap: '$l',
  marginVertical: '$l',
  padding: '$l',

  variants: {
    direction: {
      vertical: {
        flexDirection: 'column',
      },
      horizontal: {
        flexDirection: 'row',
      },
    },
  },

  defaultVariants: {
    direction: 'vertical',
  },
})

export const Demo: React.FC<React.ComponentProps<typeof DemoContainer>> = ({
  children,
  ...props
}) => {
  return (
    <Theme>
      <DemoContainer {...props}>{children}</DemoContainer>
    </Theme>
  )
}

export const DemoItem: React.FC<{title: string}> = ({title, children}) => {
  return (
    <Box css={{display: 'flex', flexDirection: 'column', gap: '$2xs'}}>
      <Text variant="ui-tiny" color="mutted">
        {title}
      </Text>
      {children}
    </Box>
  )
}
