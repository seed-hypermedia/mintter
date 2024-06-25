import Footer from '@shm/desktop/src/components/footer'
import { MainWrapperNoScroll } from '@shm/desktop/src/components/main-wrapper'
import { PublicationsList } from '@shm/desktop/src/components/publication-list'

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