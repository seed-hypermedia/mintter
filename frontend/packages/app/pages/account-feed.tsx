import {createHmId} from '@mintter/shared'
import Footer from '../components/footer'
import {MainWrapperNoScroll} from '../components/main-wrapper'
import {useNavRoute} from '../utils/navigation'
import {ResourceFeed} from './feed'

export default function AccountFeed() {
  const route = useNavRoute()
  if (route.key !== 'account-feed') throw new Error('invalid route')
  return (
    <>
      <MainWrapperNoScroll>
        <ResourceFeed id={createHmId('a', route.accountId)} />
      </MainWrapperNoScroll>
      <Footer />
    </>
  )
}
