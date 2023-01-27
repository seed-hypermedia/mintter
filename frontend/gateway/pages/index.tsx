import {getPublication} from '@mintter/shared'
import {PublicationPage} from '../publication-page'

export default function IndexPage({document}: any) {
  return (
    <PublicationPage
      documentId="bafy2bzacebhlxpfnz2qju2zruckm2ueamioabjj532hidrlxgbgucr44tmewc"
      onlyContent
    />
  )
}

// mintter://bafy2bzacebhlxpfnz2qju2zruckm2ueamioabjj532hidrlxgbgucr44tmewc/baeaxdiheaiqjuqjo4f34bu52tbzn3cfc4uu6m6imv2ildn4qkgl7jmnag7itcsq

// export async function getServerSideProps() {
//   return await getPublication(
//     'bafy2bzacec67bkejkhjcfomg7o72vgdkwrto3ry72zcb72sfb4cphuvtgiuny',
//   )
// }
