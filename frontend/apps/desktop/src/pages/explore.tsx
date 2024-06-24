import Footer from '@shm/app/components/footer'
import { MainWrapperNoScroll } from '@shm/app/components/main-wrapper'
import { PublicationsList } from '@shm/app/components/publication-list'

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