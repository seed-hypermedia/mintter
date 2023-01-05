import {useSelector} from '@xstate/react'
import Head from 'next/head'
import {InterpreterFrom} from 'xstate'
import {PublicationMetadata} from './author'
import {publicationMachine} from './machines/publication-machine'
import {SlateReactPresentation} from './slate-react-presentation'
import {useRenderElement} from './slate-react-presentation/render-element'
import {useRenderLeaf} from './slate-react-presentation/render-leaf'
import {PublicationPlaceholder} from './publication-placeholder'

type PublicationContentProps = {
  service: InterpreterFrom<typeof publicationMachine>
  onlyContent?: boolean
}

export function PublicationContent({
  service,
  onlyContent = false,
}: PublicationContentProps) {
  let renderElement = useRenderElement()
  let renderLeaf = useRenderLeaf()

  let publication = useSelector(service, (state) => state.context.publication)
  let value = useSelector(service, (state) => state.context.editorValue)

  return publication && value ? (
    <>
      <Head>
        <meta
          property="og:image"
          content={`https://mintter.com/api/og?title=${
            publication?.document.title || 'Untitled Document'
          }`}
        />
      </Head>
      <article className="sidebar">
        <div>
          {!onlyContent ? (
            <PublicationMetadata publication={publication} />
          ) : null}
        </div>
        <div>
          <SlateReactPresentation
            value={[value]}
            renderElement={renderElement}
            renderLeaf={renderLeaf}
          />
        </div>
      </article>
    </>
  ) : (
    <PublicationPlaceholder />
  )
}
