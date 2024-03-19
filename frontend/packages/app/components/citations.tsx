import {useEntityMentions} from '@mintter/app/models/content-graph'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {formattedDateMedium, pluralS, unpackHmId} from '@mintter/shared'
import {Mention} from '@mintter/shared/src/client/.generated/entities/v1alpha/entities_pb'
import {PanelCard} from '@mintter/ui'
import {useAccount} from '../models/accounts'
import {useEntityTimeline} from '../models/changes'
import {useDocTextContent, usePublication} from '../models/documents'
import {PublicationRoute} from '../utils/routes'
import {AccessoryContainer} from './accessory-sidebar'
import {AccountLinkAvatar} from './account-link-avatar'

function CitationItem({mention}: {mention: Mention}) {
  if (!mention.source) throw 'Invalid citation'
  const spawn = useNavigate('spawn')
  console.log('CitationItem', mention)
  const sourceId = unpackHmId(mention.source)
  if (sourceId?.type !== 'd')
    throw new Error('CitationItem only supports documents right now')
  const pub = usePublication(
    {
      id: mention.source,
      version: mention.sourceBlob?.cid,
    },
    {
      enabled: !!mention.source,
    },
  )
  const versionChanges = new Set(sourceId?.version?.split('.'))
  const timeline = useEntityTimeline(mention.source)
  const authors = new Set(
    timeline.data?.timelineEntries
      .filter(([changeId]) => versionChanges.has(changeId))
      .map(([changeId, change]) => change.author),
  )
  let {data: account} = useAccount(pub.data?.document?.author)

  const docTextContent = useDocTextContent(pub.data)
  const destRoute: PublicationRoute = {
    key: 'publication',
    documentId: sourceId?.qid,
    versionId: mention.sourceBlob?.cid,
    blockId: mention.sourceContext,
    variants: [...authors].map((author) => ({key: 'author', author})),
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

export function DocCitationsAccessory({docId}: {docId?: string}) {
  const mentions = useEntityMentions(docId)
  if (!docId) return null
  const count = mentions.data?.mentions?.length || 0

  const citationSet = new Set()
  const distinctMentions = mentions.data?.mentions.filter((item) => {
    if (!citationSet.has(item?.source)) {
      citationSet.add(item?.source)
      return true
    }
    return false
  })

  // TODO: This code also filters citations based on version of document where citation is used and on blockId, which was cited.
  // The current code will show only distinct documents, but if the first citation was in old version, it will point to the old version, which I feel is not good.
  // Maybe we could display version with document title, and/or blockId, which was cited.
  // const distinctMentions = citations?.links?.map(item => {
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
      {distinctMentions?.map((mention, index) => (
        <CitationItem
          key={`${mention.source}${mention.targetVersion}${mention.targetFragment}`}
          mention={mention}
        />
      ))}
    </AccessoryContainer>
  )
}

export function EntityCitationsAccessory({entityId}: {entityId?: string}) {
  const mentions = useEntityMentions(entityId)
  if (!entityId) return null
  const count = mentions?.data?.mentions?.length || 0

  const citationSet = new Set()
  const distinctMentions = mentions?.data?.mentions?.filter((item) => {
    if (!citationSet.has(item?.source)) {
      citationSet.add(item?.source)
      return true
    }
    return false
  })

  return (
    <AccessoryContainer title={`${count} ${pluralS(count, 'Citation')}`}>
      {distinctMentions?.map((mention, index) => (
        <CitationItem
          key={`${mention.source}${mention.targetVersion}${mention.targetFragment}`}
          mention={mention}
        />
      ))}
    </AccessoryContainer>
  )
}
