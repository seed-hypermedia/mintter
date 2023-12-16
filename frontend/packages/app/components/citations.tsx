import {CitationLink, useDocCitations} from '@mintter/app/models/content-graph'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {formattedDateMedium, pluralS} from '@mintter/shared'
import {PanelCard} from '@mintter/ui'
import {useAccount} from '../models/accounts'
import {useEntityTimeline} from '../models/changes'
import {useDocTextContent, usePublication} from '../models/documents'
import {PublicationRoute} from '../utils/navigation'
import {AccessoryContainer} from './accessory-sidebar'
import {AccountLinkAvatar} from './account-link-avatar'

function CitationItem({link}: {link: CitationLink}) {
  if (!link.source || !link.source.documentId) throw 'Invalid citation'
  const spawn = useNavigate('spawn')

  const pub = usePublication({
    id: link.source.documentId,
    version: link.source.version,
    enabled: !!link.source?.documentId,
  })
  const versionChanges = new Set(link.source.version.split('.'))
  const timeline = useEntityTimeline(link.source.documentId)
  const authors = new Set(
    timeline.data?.timelineEntries
      .filter(([changeId]) => versionChanges.has(changeId))
      .map(([changeId, change]) => change.author),
  )
  let {data: account} = useAccount(pub.data?.document?.author)

  const docTextContent = useDocTextContent(pub.data)
  const destRoute: PublicationRoute = {
    key: 'publication',
    documentId: link.source.documentId,
    versionId: link.source.version,
    blockId: link.source?.blockId,
    variant: {key: 'authors', authors: [...authors]},
  }
  return (
    <PanelCard
      title={pub.data?.document?.title}
      content={docTextContent}
      author={account}
      date={formattedDateMedium(pub.data?.document?.createTime)}
      onPress={() => {
        spawn(destRoute)
      }}
      avatar={
        <AccountLinkAvatar accountId={pub.data?.document?.author} size={24} />
      }
    />
  )
}

export function CitationsAccessory({docId}: {docId?: string}) {
  const {data: citations} = useDocCitations(docId)
  if (!docId) return null
  const count = citations?.links?.length || 0

  const citationSet = new Set()
  const distinctCitations = citations?.links.filter((item) => {
    if (!citationSet.has(item?.source?.documentId)) {
      citationSet.add(item?.source?.documentId)
      return true
    }
    return false
  })

  // TODO: This code also filters citations based on version of document where citation is used and on blockId, which was cited.
  // The current code will show only distinct documents, but if the first citation was in old version, it will point to the old version, which I feel is not good.
  // Maybe we could display version with document title, and/or blockId, which was cited.
  // const distinctCitations = citations?.links?.map(item => {
  //   const { source, target } = item;
  //   const combination = `${source?.documentId}-${source?.version}-${target?.blockId}`;

  //   if (!citationSet.has(combination)) {
  //     citationSet.add(combination);
  //     return item
  //   }

  //   return null;
  // }).filter(item => item !== null);

  return (
    <AccessoryContainer title={`${count} ${pluralS(count, 'Citation')}`}>
      {distinctCitations?.map((link, index) => (
        <CitationItem
          key={`${link.source?.documentId}${link.source?.version}${link.source?.blockId}`}
          link={link}
        />
      ))}
    </AccessoryContainer>
  )
}
