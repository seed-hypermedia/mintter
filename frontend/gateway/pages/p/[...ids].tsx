import {useQuery} from '@tanstack/react-query'
import {useMachine} from '@xstate/react'
import {getPublication} from '../../client'
import Footer from '../../footer'
import {SiteHead} from '../../site-head'
import {publicationMachine} from '../../machines/publication-machine'
import {SlateReactPresentation} from '../../slate-react-presentation'
import {useRenderElement} from '../../slate-react-presentation/render-element'
import {useRenderLeaf} from '../../slate-react-presentation/render-leaf'
import {PublicationMetadata} from '../../author'
import {useRouter} from 'next/router'

export default function PublicationPage() {
  const router = useRouter()
  let [docId, version] = router.query.ids || []

  let [state, send] = useMachine(() => publicationMachine)
  let renderElement = useRenderElement()
  let renderLeaf = useRenderLeaf()

  useQuery({
    queryKey: ['PUBLICATION', docId, version],
    queryFn: ({queryKey}) => getPublication(queryKey[1], queryKey[2]),
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
        <article className="sidebar">
          <div>
            <PublicationMetadata publication={state.context.publication} />
          </div>
          <div>
            {state.context.editorValue ? (
              <SlateReactPresentation
                value={[state.context.editorValue]}
                renderElement={renderElement}
                renderLeaf={renderLeaf}
              />
            ) : null}
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}

// export async function getStaticProps({params}) {
//   console.log('🚀 ~ file: [...ids].tsx:75 ~ getStaticProps ~ params', params)
//   // const { tweet } = params

//   // if (tweet.length > 40 || !TWEET_ID.test(tweet)) {
//   //   return { notFound: true }
//   // }

//   // try {
//   //   const ast = await fetchTweetAst(tweet)
//   //   return ast ? { props: { ast } } : { notFound: true }
//   // } catch (error) {
//   //   // The Twitter API most likely died
//   //   console.error(error)
//   //   return { notFound: true }
//   // }

//   return {
//     props: {params},
//   }
// }

// export async function getStaticPaths() {
//   return {paths: [], fallback: true}
// }
