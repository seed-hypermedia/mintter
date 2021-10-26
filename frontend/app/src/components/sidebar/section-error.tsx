import {Box} from '@mintter/ui/box'
import {Text} from '@mintter/ui/text'
import {FallbackProps} from 'react-error-boundary'

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
