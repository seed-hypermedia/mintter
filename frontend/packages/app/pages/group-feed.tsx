import Footer from '../components/footer'
import {MainWrapperNoScroll} from '../components/main-wrapper'
import {useNavRoute} from '../utils/navigation'
import {ResourceFeed} from './feed'

export default function GroupFeed() {
  const route = useNavRoute()
  if (route.key !== 'group-feed') throw new Error('invalid route')
  return (
    <>
      <MainWrapperNoScroll>
        <ResourceFeed id={route.groupId} />
      </MainWrapperNoScroll>
      <Footer />
    </>
  )
}
