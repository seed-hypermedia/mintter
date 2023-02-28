import {Account, blockNodeToSlate, Publication} from '@mintter/shared'
import {useRouter} from 'next/router'
import {PublicationMetadata} from './author'
import Footer from './footer'
import {SiteHead} from './site-head'
import {SlateReactPresentation} from './slate-react-presentation'
import {useRenderElement} from './slate-react-presentation/render-element'
import {useRenderLeaf} from './slate-react-presentation/render-leaf'

export default function PublicationPage({
  publication,
  metadata = true,
  author,
}: {
  publication?: Publication
  author?: Account | null
  metadata?: boolean
}) {
  const router = useRouter()
  // const [docId, version] = router.query.ids || []
  const renderElement = useRenderElement()
  const renderLeaf = useRenderLeaf()
  const blockChildren = publication?.document?.children
  const slateChildren = blockChildren
    ? blockNodeToSlate(blockChildren, 'group')
    : undefined

  return (
    <>
      <SiteHead title={publication?.document?.title} />
      <main
        id="main-content"
        tabIndex={-1}
        className="main-content wrapper text-size-100"
      >
        <article className="sidebar">
          <div>
            {metadata ? (
              <PublicationMetadata publication={publication} author={author} />
            ) : null}
          </div>
          <div>
            {slateChildren ? (
              <SlateReactPresentation
                value={[slateChildren]}
                renderElement={renderElement}
                renderLeaf={renderLeaf}
              />
            ) : (
              <p>Empty document.</p>
            )}
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}
