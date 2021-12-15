import {Box, Text} from '@mintter/ui'
import {EditorDocument} from 'frontend/app/src/editor'
import {ClientPublication} from 'frontend/app/src/pages/publication'
import {useAccount} from '../hooks'
import {Avatar} from './avatar'

export type PageDocumentHeaderProps = Pick<ClientPublication, 'document'>

export function PageDocumentHeader({document}: {document?: EditorDocument} | ClientPublication) {
  const {data: author} = useAccount(document?.author, {
    enabled: !!document?.author,
  })
  if (!document) return null

  return (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '$4',
      }}
    >
      {author && (
        <Box css={{gridArea: 'author', display: 'flex', gap: '$3', alignItems: 'center'}}>
          <Avatar size="3" />
          <Text size="3" fontWeight="medium">
            {author.profile?.alias}
          </Text>
        </Box>
      )}
      <Text size="5" color="muted">
        {document?.title}
      </Text>
    </Box>
  )
}
