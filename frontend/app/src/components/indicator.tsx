import {Box} from './box'

export function OnlineIndicator({online}: {online: boolean}) {
  return (
    <Box
      css={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        backgroundColor: online ? 'var(--success-active)' : 'transparent',
      }}
    />
  )
}
