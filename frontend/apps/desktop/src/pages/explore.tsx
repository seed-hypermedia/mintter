import { DocumentsFullList } from '@/components/document-list'
import Footer from '@/components/footer'
import { MainWrapperNoScroll } from '@/components/main-wrapper'

export default function ExplorePage() {
  return (
    <>
      <MainWrapperNoScroll>
        <DocumentsFullList header={null} />
      </MainWrapperNoScroll>
      <Footer />
    </>
  )
}
