import {FallbackProps} from 'react-error-boundary'
import {Box} from '../box'
import {Text} from '../text'

export function SectionError({error, resetErrorBoundary}: FallbackProps) {
  return (
    <Box
      role="alert"
      css={{
        padding: '$3',
      }}
    >
      <Text size="1">Section Error</Text>
      <Text size="1" as="pre">
        {error.message}
      </Text>
      <button onClick={resetErrorBoundary}>reload</button>
    </Box>
  )
}
