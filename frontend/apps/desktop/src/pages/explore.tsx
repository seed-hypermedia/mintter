import Footer from '@/components/footer'
import {MainWrapperNoScroll} from '@/components/main-wrapper'
import {PublicationsList} from '@/components/publication-list'

export default function ExplorePage() {
  return (
    <>
      <MainWrapperNoScroll>
        <PublicationsList header={null} trustedOnly={false} />
      </MainWrapperNoScroll>
      <Footer />
    </>
  )
}
