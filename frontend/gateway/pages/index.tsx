import {useQuery} from '@tanstack/react-query'
import {useMachine} from '@xstate/react'
import {getPublication} from '../client'
import Footer from '../footer'
import {SiteHead} from '../site-head'
import {publicationMachine} from '../machines/publication-machine'
import {SlateReactPresentation} from '../slate-react-presentation'
import {useRenderElement} from '../slate-react-presentation/render-element'
import {useRenderLeaf} from '../slate-react-presentation/render-leaf'
import {StateFrom} from 'xstate'

export default function IndexPage({document}: any) {
  let [state, send] = useMachine(() => publicationMachine)

  useQuery({
    queryKey: [
      'PUBLICATION',
      'bafy2bzacecmqasguedv5vsyzydni3rbmlde5ud4lwpsesaad3utvdfpw24mmw',
    ],
    queryFn: ({queryKey}) => getPublication(queryKey[1]),
    onSettled: (publication, error) => {
      if (publication) {
        send({type: 'PUBLICATION.FETCH.SUCCESS', publication})
      } else {
        send({
          type: 'PUBLICATION.FETCH.ERROR',
          errorMessage: `fetch error: ${error}`,
        })
      }
    },
  })

  return (
    <>
      <SiteHead />
      <main
        id="main-content"
        tabIndex={-1}
        className="main-content wrapper text-size-1"
      >
        <Content state={state} />
      </main>
      <Footer />
    </>
  )
}

function Content({state}: {state: StateFrom<typeof publicationMachine>}) {
  let renderElement = useRenderElement()
  let renderLeaf = useRenderLeaf()

  if (state.matches('fetching')) {
    return <RootPlaceholder />
  }

  if (state.matches('settled') && state.context.editorValue) {
    return (
      <SlateReactPresentation
        value={[state.context.editorValue]}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
      />
    )
  }

  return null
}

function RootPlaceholder() {
  return null
}