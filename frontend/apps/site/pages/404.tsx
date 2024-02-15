import {HYPERMEDIA_ENTITY_TYPES, unpackHmId} from '@mintter/shared'
import {Button, Paragraph, SizableText} from '@mintter/ui'
import Link from 'next/link'
import {ErrorPage} from 'src/error-page'

export default function NotFoundPage() {
  return <ErrorPage title="Page not found" description=":(" />
}

export function EntityNotFoundPage({
  id,
  version,
}: {
  id: string
  version?: string | null
}) {
  const hmId = unpackHmId(id)
  const entityTypeName = hmId ? HYPERMEDIA_ENTITY_TYPES[hmId.type] : 'Entity'
  return (
    <ErrorPage
      title={`${entityTypeName} not found`}
      description={hmId ? `ID: ${hmId.qid}` : ''}
      alignItems="flex-start"
    >
      {version && <SizableText color="$color9">Version: {version}</SizableText>}
      <Paragraph>
        We couldn't find this {entityTypeName.toLowerCase()}. You might be able
        to find it in the{' '}
        <Link href="/download-mintter-hypermedia" target="_blank">
          Mintter App
        </Link>{' '}
        if you are connected to a peer who has it.
      </Paragraph>
      <Link passHref href={id} style={{textDecoration: 'none'}}>
        <Button>Open in Mintter App</Button>
      </Link>
    </ErrorPage>
  )
}
