import {MainActor} from '@app/hooks/main-actor'
import {Box} from '@components/box'
import {Heading} from '@components/heading'
import {Text} from '@components/text'

export type PageProps = {
  mainActor: MainActor
}

export function NotFoundPage(props: PageProps) {
  return (
    <Box>
      <Heading>404</Heading>
      <Text>Page not found</Text>
    </Box>
  )
}
