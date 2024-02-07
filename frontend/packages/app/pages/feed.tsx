import {
  Globe,
  PageContainer,
  RadioButtons,
  SizableText,
  XStack,
  YStack,
} from '@mintter/ui'
import {Verified} from '@tamagui/lucide-icons'
import Footer from '../components/footer'
import {MainWrapperNoScroll} from '../components/main-wrapper'
import {useFeed} from '../models/feed'
import {useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'

const feedTabsOptions = [
  {key: 'trusted', label: 'Trusted Content', icon: Verified},
  {key: 'all', label: 'All Content', icon: Globe},
] as const

function Feed({tab}: {tab: 'trusted' | 'all'}) {
  const feed = useFeed()
  console.log(feed.data)
  return (
    <YStack f={1}>
      <SizableText>{tab}</SizableText>
    </YStack>
  )
}

export default function FeedPage() {
  const route = useNavRoute()
  if (route.key !== 'feed') throw new Error('invalid route')
  const replace = useNavigate('replace')
  return (
    <>
      <MainWrapperNoScroll>
        <YStack f={1}>
          <PageContainer>
            <XStack>
              <RadioButtons
                value={route.tab}
                options={feedTabsOptions}
                onValue={(tab) => {
                  replace({...route, tab})
                }}
              />
            </XStack>
          </PageContainer>
          <Feed tab={route.tab} />
        </YStack>
      </MainWrapperNoScroll>
      <Footer />
    </>
  )
}
