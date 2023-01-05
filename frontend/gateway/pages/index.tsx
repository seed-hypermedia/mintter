import {useEffect} from 'react'
import {getPublication} from '../client'
import {PublicationPage} from '../publication-page'

export default function IndexPage({document}: any) {
  useEffect(() => {
    getPublication(
      'bafy2bzaceb5cnsnhyrwfx22xqixh4qmphj6k6a3gqxpfu6s7euk5bovurmrhk',
    )
      .then((res) => {
        console.log('PLAIN RES!!', res)
      })
      .catch((err) => {
        console.error('ERROR', err)
      })
  }, [])

  return (
    <PublicationPage
      documentId="bafy2bzaceb5cnsnhyrwfx22xqixh4qmphj6k6a3gqxpfu6s7euk5bovurmrhk"
      onlyContent
    />
  )
}

// mintter://bafy2bzaceb5cnsnhyrwfx22xqixh4qmphj6k6a3gqxpfu6s7euk5bovurmrhk/baeaxdiheaiqpazrdmjji6xifvr5nuky2ibn6fic3ktayrycudsasfephqprna5a
