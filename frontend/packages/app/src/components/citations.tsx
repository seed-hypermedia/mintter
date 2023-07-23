import {
  CitationLink,
  useDocCitations,
} from '@mintter/app/src/models/content-graph'
import {queryKeys} from '@mintter/app/src/models/query-keys'
import {useNavigate} from '@mintter/app/src/utils/navigation'
import {pluralS} from '@mintter/shared'
import {Button, SizableText} from '@mintter/ui'
import {useQuery} from '@tanstack/react-query'
import {AccessoryContainer} from './accessory-sidebar'
import {useGRPCClient} from '../app-context'

function CitationItem({link, docId}: {link: CitationLink; docId: string}) {
  if (!link.source?.documentId) throw 'Invalid citation'
  const grpcClient = useGRPCClient()
  const spawn = useNavigate('spawn')
  const pub = useQuery({
    queryKey: [
      queryKeys.GET_PUBLICATION,
      link.source.documentId,
      link.source.version,
    ],
    enabled: !!link.source?.documentId,
    queryFn: () =>
      grpcClient.publications.getPublication({
        documentId: link.source?.documentId,
        version: link.source?.version,
      }),
  })
  return (
    <Button
      key={`${link.source?.documentId}${link.source?.version}${link.source?.blockId}`}
      chromeless
      onPress={() => {
        const sourceDocId = link.source?.documentId
        if (!sourceDocId) return
        spawn({
          key: 'publication',
          documentId: sourceDocId,
          versionId: link.source?.version,
          blockId: link.source?.blockId,
        })
      }}
      flexDirection="row"
      gap="$3"
      alignItems="center"
      position="relative"
      hoverStyle={{
        cursor: 'default',
      }}
    >
      <SizableText size="$2">{pub.data?.document?.title}</SizableText>
    </Button>
  )
}

export function CitationsAccessory({
  docId,
  version,
}: {
  docId?: string
  version?: string
}) {
  const {data: citations} = useDocCitations(docId)
  if (!docId) return null
  const count = citations?.links?.length || 0
  return (
    <AccessoryContainer title={`${count} ${pluralS(count, 'Citation')}`}>
      {citations?.links.map((link) => (
        <CitationItem
          docId={docId}
          key={`${link.source?.documentId}${link.source?.version}${link.source?.blockId}`}
          link={link}
        />
      ))}
    </AccessoryContainer>
  )
}
