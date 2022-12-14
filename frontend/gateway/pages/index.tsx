import {useQuery} from '@tanstack/react-query'
import {useMachine} from '@xstate/react'
import {getPublication} from '../client'
import Footer from '../footer'
import {SiteHead} from '../site-head'
import {publicationMachine} from '../machines/publication-machine'

export default function IndexPage({document}: any) {
  let [state, send] = useMachine(() => publicationMachine)
  useQuery({
    queryKey: ['PUBLICATION', 'bafy2bzacecmqasguedv5vsyzydni3rbmlde5ud4lwpsesaad3utvdfpw24mmw'],
    queryFn: () => getPublication('bafy2bzacecmqasguedv5vsyzydni3rbmlde5ud4lwpsesaad3utvdfpw24mmw'),
    onSettled: (publication, error) => {
      if (publication) {
        send({type: 'PUBLICATION.FETCH.SUCCESS', publication})
      } else {
        send({type: 'PUBLICATION.FETCH.ERROR', errorMessage: `fetch error: ${error}`})
      }
      
    }
  })
    
    
    
  return (
    <>
      <SiteHead />
      <main id="main-content" tabIndex={-1} className="main-content wrapper text-size-1">
        <article className="flow">
          <pre>{JSON.stringify({value: state.value, context: state.context}, null, 3)}</pre>
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
