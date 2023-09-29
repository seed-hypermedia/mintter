import {
  CitationLink,
  useDocCitations,
} from '@mintter/app/src/models/content-graph'
import {useNavigate} from '@mintter/app/src/utils/useNavigate'
import {pluralS} from '@mintter/shared'
import {SizableText, XStack, YStack} from '@mintter/ui'
import {useDocTextContent, usePublication} from '../models/documents'
import {AccessoryContainer} from './accessory-sidebar'
import {AccountLinkAvatar} from './account-link-avatar'

function CitationItem({
  link,
  docId,
  isFirst,
  isLast,
}: {
  link: CitationLink
  docId: string
  isFirst: boolean
  isLast: boolean
}) {
  if (!link.source?.documentId) throw 'Invalid citation'
  const spawn = useNavigate('spawn')

  const pub = usePublication({
    documentId: link.source.documentId,
    versionId: link.source.version,
    enabled: !!link.source?.documentId,
  })

  const {data: docTextContent} = useDocTextContent(pub.data)
  let avatarSize = 44
  return (
    <XStack
      alignItems="center"
      hoverStyle={{
        cursor: 'pointer',
        backgroundColor: '$backgroundHover',
      }}
      padding="$4"
      gap="$4"
    >
      {/* <YStack
        position="absolute"
        width={2}
        height={isFirst || isLast ? '50%' : '100%'}
        top={isFirst ? '50%' : 0}
        left={(avatarSize - 2) / 2}
        backgroundColor="$color5"
      /> */}
      <XStack alignSelf="stretch">
        <AccountLinkAvatar
          accountId={pub.data?.document?.author}
          size={avatarSize}
        />
      </XStack>
      <XStack
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
        flex={1}
        gap="$4"
        alignItems="flex-start"
        overflow="hidden"
        borderRadius="$4"
      >
        {/* <Square size={100} backgroundColor="$color10" /> */}

        <YStack gap="$2" flex={1}>
          <SizableText
            textOverflow="ellipsis"
            overflow="hidden"
            whiteSpace="nowrap"
          >
            {pub.data?.document?.title}
          </SizableText>
          <SizableText color="$color10" overflow="hidden" maxHeight={69}>
            {docTextContent}
          </SizableText>
        </YStack>
      </XStack>
    </XStack>
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
          docId={docId}
          key={`${link.source?.documentId}${link.source?.version}${link.source?.blockId}`}
          link={link}
          isFirst={index == 0}
          isLast={index == distinctCitations.length - 1}
        />
      ))}
    </AccessoryContainer>
  )
}
