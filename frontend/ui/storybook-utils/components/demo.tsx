import {Box} from '@src/box'
import {styled} from '@src/stitches.config'
import {Text} from '@src/text'
import {Theme} from '@src/theme'

const DemoContainer = styled(Box, {
  backgroundColor: '$background-alt',
  borderRadius: 8,
  boxShadow: '$3',
  display: 'flex',
  gap: '$6',
  marginVertical: '$6',
  padding: '$6',

  variants: {
    direction: {
      vertical: {
        flexDirection: 'column',
      },
      horizontal: {
        alignItems: 'center',
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
    <Box css={{display: 'flex', flexDirection: 'column', gap: '$2'}}>
      <Text variant="tiny" color="muted">
        {title}
      </Text>
      {children}
    </Box>
  )
}
