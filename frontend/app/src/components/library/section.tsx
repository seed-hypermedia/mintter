import {css} from '@app/stitches.config'
import {PropsWithChildren, ReactNode} from 'react'
import {Box} from '../box'
import {Icon, icons} from '../icon'
import {Text} from '../text'

export function Section({
  title,
  icon,
  children,
  actions,
  ...props
}: PropsWithChildren<{
  title: string
  icon?: keyof typeof icons
  actions?: ReactNode
}>) {
  return (
    <Box {...props}>
      <Box
        css={{
          display: 'flex',
          gap: '$3',
          alignItems: 'center',
          paddingHorizontal: '$3',
          paddingVertical: '$2',
          borderRadius: '$2',

          '&:hover': {
            backgroundColor: '$base-component-bg-normal',
            cursor: 'pointer',
          },
          [`&[data-state="open"] [data-arrow]`]: {
            transform: 'rotate(90deg)',
          },
        }}
      >
        {icon && <Icon color="primary" name={icon} />}
        <Box css={{flex: 1}} data-testid="section-title">
          <Text size="2" fontWeight="medium">
            {title}
          </Text>
        </Box>
        {actions}
      </Box>
      <ul className={sectionContentStyle()} data-testid="section-list">
        {children}
      </ul>
    </Box>
  )
}

var sectionContentStyle = css({
  paddingLeft: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: '$1',
  margin: 0,
})

export function EmptyList() {
  return (
    <Box
      css={{
        marginVertical: '$2',
        padding: '$4',
        backgroundColor: '$base-component-bg-normal',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text size="1" color="muted">
        Empty List
      </Text>
    </Box>
  )
}
