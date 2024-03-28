import Footer from '@mintter/app/components/footer'
import {unpackHmId} from '@mintter/shared'
import {
  Container,
  List,
  PageContainer,
  RadioButtons,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import {Book, FileText} from '@tamagui/lucide-icons'
import {useCopyGatewayReference} from '../components/copy-gateway-reference'
import {MainWrapperNoScroll} from '../components/main-wrapper'
import {useAllGroups} from '../models/groups'
import {useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'
import {GroupListItem} from './groups'
import {PublicationsList} from './publication-list-page'

const documentTabsOptions = [
  {key: 'docs', label: 'Documents', icon: FileText},
  {key: 'groups', label: 'Groups', icon: Book},
] as const

function ExploreTabs() {
  const route = useNavRoute()
  if (route.key !== 'explore') throw new Error(`invalid route: ${route.key}`)
  const replace = useNavigate('replace')
  return (
    <PageContainer marginVertical="$6">
      <XStack>
        <RadioButtons
          value={route.tab}
          options={documentTabsOptions}
          onValue={(tab) => {
            replace({...route, tab})
          }}
        />
      </XStack>
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
      <Footer />
    </>
  )
}
