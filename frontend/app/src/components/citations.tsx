import {publicationsClient} from '@app/api-clients'
import {CitationLink, queryKeys, useDocCitations} from '@app/hooks'
import {openPublication} from '@app/utils/navigation'
import {useQuery} from '@tanstack/react-query'
import {Button} from './button'
import {PanelTitle} from './panel'
import {Text} from './text'

function CitationItem({link, docId}: {link: CitationLink; docId: string}) {
  if (!link.source?.documentId) throw 'Invalid citation'
  const pub = useQuery({
    queryKey: [
      queryKeys.GET_PUBLICATION,
      link.source.documentId,
      link.source.version,
    ],
    enabled: !!link.source?.documentId,
    queryFn: () =>
      publicationsClient.getPublication({
        documentId: link.source?.documentId,
        version: link.source?.version,
      }),
  })
  return (
    <Button
      key={`${link.source?.documentId}${link.source?.version}${link.source?.blockId}`}
      as="li"
      variant="ghost"
      color="muted"
      onClick={() => {
        const sourceDocId = link.source?.documentId
        if (!sourceDocId) return
        openPublication(sourceDocId, link.source?.version, link.source?.blockId)
      }}
      css={{
        listStyle: 'none',
        display: 'flex',
        flexDirection: 'row',
        gap: '$3',
        alignItems: 'center',
        position: 'relative',
        '&:hover': {
          cursor: 'default',
        },
      }}
    >
      <Text size="2">{pub.data?.document?.title}</Text>
    </Button>
  )
}

export function Citations({
  docId,
  version,
}: {
  docId?: string
  version?: string
}) {
  const {data: citations} = useDocCitations(docId)
  if (!docId) return null
  return (
    <>
      <PanelTitle>Citations</PanelTitle>
      {citations?.links.map((link) => (
        <CitationItem
          docId={docId}
          key={`${link.source?.documentId}${link.source?.version}${link.source?.blockId}`}
          link={link}
        />
      ))}
    </>
  )
}
