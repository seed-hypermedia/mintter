import Footer from '@shm/app/components/footer'
import {unpackHmId} from '@shm/shared'
import {
  Container,
  List,
  PageContainer,
  RadioButtons,
  Section,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@shm/ui'
import {Book, FileText} from '@tamagui/lucide-icons'
import {useCopyGatewayReference} from '../components/copy-gateway-reference'
import {useDeleteDialog} from '../components/delete-dialog'
import {GroupListItem} from '../components/groups-list'
import {MainWrapperNoScroll} from '../components/main-wrapper'
import {PublicationsList} from '../components/publication-list'
import {useAllGroups} from '../models/groups'
import {useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'

const exploreTabsOptions = [
  {key: 'docs', label: 'Documents', icon: FileText},
  {key: 'groups', label: 'Groups', icon: Book},
] as const

function ExploreTabs() {
  const route = useNavRoute()
  if (route.key !== 'explore') throw new Error(`invalid route: ${route.key}`)
  const replace = useNavigate('replace')
  return (
    <PageContainer marginVertical="$6">
      <Section paddingVertical={0}>
        <XStack>
          <RadioButtons
            value={route.tab}
            options={exploreTabsOptions}
            onValue={(tab) => {
              replace({...route, tab})
            }}
          />
        </XStack>
      </Section>
    </PageContainer>
  )
}

export default function ExplorePage() {
  const route = useNavRoute()
  if (route.key !== 'explore') throw new Error(`invalid route: ${route.key}`)
  if (route.tab === 'docs') return <ExploreDocsPage />
  if (route.tab === 'groups') return <ExploreGroupsPage />
}

function ExploreDocsPage() {
  return (
    <>
      <MainWrapperNoScroll>
        <PublicationsList header={<ExploreTabs />} trustedOnly={false} />
      </MainWrapperNoScroll>
      <Footer />
    </>
  )
}

export function ExploreGroupsPage() {
  const groupQuery = useAllGroups()
  const groups = groupQuery.data?.groups || []
  const [copyDialogContent, onCopyId] = useCopyGatewayReference()
  const deleteDialog = useDeleteDialog()
  let content = groupQuery.isLoading ? (
    <Container>
      <Spinner />
    </Container>
  ) : groups.length > 0 ? (
    <List
      items={groups}
      header={<ExploreTabs />}
      renderItem={({item}) => (
        <GroupListItem
          group={item}
          onCopy={() => {
            const groupId = unpackHmId(item.id)
            if (!groupId) return
            onCopyId(groupId)
          }}
          onDelete={() => {
            deleteDialog.open({id: item.id, title: item.title})
          }}
        />
      )}
    />
  ) : (
    <Container>
      <YStack gap="$5" paddingVertical="$8">
        <Text fontFamily="$body" fontSize="$3">
          You have no groups to explore yet.
        </Text>
      </YStack>
    </Container>
  )
  return (
    <>
      <MainWrapperNoScroll>{content}</MainWrapperNoScroll>
      {copyDialogContent}
      {deleteDialog.content}
      <Footer />
    </>
  )
}
