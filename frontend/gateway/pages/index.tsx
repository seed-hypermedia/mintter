import {useQuery} from '@tanstack/react-query'
import {useMachine} from '@xstate/react'
import {getPublication} from '../client'
import Footer from '../footer'
import {SiteHead} from '../site-head'
import {publicationMachine} from '../machines/publication-machine'
import {SlateReactPresentation} from '../slate-react-presentation'
import {useCallback} from 'react'
import {RenderElementProps, RenderLeafProps} from 'slate-react'

export default function IndexPage({document}: any) {
  let [state, send] = useMachine(() => publicationMachine)
  let renderElement = useRenderElement()
  let renderLeaf = useRenderLeaf()
  useQuery({
    queryKey: [
      'PUBLICATION',
      'bafy2bzacecmqasguedv5vsyzydni3rbmlde5ud4lwpsesaad3utvdfpw24mmw',
    ],
    queryFn: () =>
      getPublication(
        'bafy2bzacecmqasguedv5vsyzydni3rbmlde5ud4lwpsesaad3utvdfpw24mmw',
      ),
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
        <article className="flow">
          {state.context.editorValue ? (
            <SlateReactPresentation
              value={[state.context.editorValue]}
              renderElement={renderElement}
              renderLeaf={renderLeaf}
            />
          ) : null}

          <pre>
            {JSON.stringify(
              {value: state.value, context: state.context},
              null,
              3,
            )}
          </pre>
        </article>
      </main>
      <Footer />
    </>
  )
}

export async function getStaticProps() {
  // mintter://bafy2bzacecmqasguedv5vsyzydni3rbmlde5ud4lwpsesaad3utvdfpw24mmw/baeaxdiheaiqix5ix4cu4obn6arq6oqupdqchb6k46uph45cfiv5k7ypswaf77la

  // let document = await getPublication(
  //   'bafy2bzacecmqasguedv5vsyzydni3rbmlde5ud4lwpsesaad3utvdfpw24mmw',
  //   undefined,
  //   true,
  // )
  // console.log("🚀 ~ file: index.tsx:27 ~ getStaticProps ~ document", document)

  return {
    props: {document: ''},
  }
}

function useRenderElement() {
  return useCallback(({attributes, children, element}: RenderElementProps) => {
    switch (element.type) {
      case 'h1':
        return <h1 {...attributes}>{children}</h1>

      // ...

      default:
        return <p {...attributes}>{children}</p>
    }
  }, [])
}

function useRenderLeaf() {
  return useCallback(({attributes, children, leaf}: RenderLeafProps) => {
    if (leaf.emphasis) {
      children = <i>{children}</i>
    }

    if (leaf.strong) {
      children = <b>{children}</b>
    }

    // ...

    return <span {...attributes}>{children}</span>
  }, [])
}
