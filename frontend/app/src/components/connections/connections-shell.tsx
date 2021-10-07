import {Box} from '@mintter/ui/box'
import {Placeholder} from '../placeholder-box'

export function ConnectionsShell() {
  return (
    <Box css={{display: 'flex', flexDirection: 'column', gap: '$4'}}>
      {[1, 2, 3].map((n) => (
        <Placeholder
          key={n}
          css={{
            height: '$space$7',
          }}
        />
      ))}
    </Box>
  )
}
