import Footer from '@mintter/app/src/components/footer'
import {Button, Container, MainWrapper, Text, YStack} from '@mintter/ui'
import {useGroup, useGroupContent} from '../models/groups'
import {useNavRoute} from '../utils/navigation'
import {AccountLinkAvatar} from '../components/account-link-avatar'
import {PublicationListItem} from '../components/publication-list-item'
import {useDraftList, usePublication} from '../models/documents'
import {Document} from '@mintter/shared'

function GroupContentItem({
  docId,
  version,
  hasDraft,
}: {
  docId: string
  version: string
  hasDraft: undefined | Document
}) {
  const pub = usePublication({documentId: docId, versionId: version})
  if (!pub.data) return null
  return (
    <PublicationListItem
      publication={pub.data}
      hasDraft={hasDraft}
      pubContext={'trusted'}
    />
  )
}

export default function GroupPage() {
  const route = useNavRoute()
  if (route.key !== 'group') throw new Error('Group page needs group route')
  const {groupId} = route
  const group = useGroup(groupId)
  const groupContent = useGroupContent(groupId)
  const drafts = useDraftList()

  return (
    <>
      <MainWrapper>
        <Container>
          <YStack
            gap="$2"
            borderBottomWidth={1}
            borderColor="$gray6"
            paddingVertical="$4"
            paddingHorizontal={0}
          >
            <Text fontFamily="$body" fontSize="$3">
              {group.data?.description}
            </Text>
          </YStack>
          <YStack
            gap="$2"
            borderBottomWidth={1}
            borderColor="$gray6"
            paddingVertical="$4"
            paddingHorizontal={0}
          >
            <AccountLinkAvatar accountId={group.data?.ownerAccountId} />
          </YStack>
          <YStack>
            {Object.entries(groupContent.data?.content || {}).map(
              ([docId, version]) => {
                return (
                  <GroupContentItem
                    key={docId}
                    docId={docId}
                    version={version}
                    hasDraft={drafts.data?.documents.find((d) => d.id == docId)}
                  />
                )
              },
            )}
          </YStack>
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}
