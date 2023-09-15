import {GetServerSideProps} from 'next'
import PublicationSlugPage, {PubSlugPageProps} from 'publication-slug-page'
import {prepareSlugPage} from 'server/page-slug'
import {EveryPageProps} from './_app'

// // Temp Mintter home screen document:
// let fallbackDocId = process.env.MINTTER_HOME_PUBID || 'mnoboS11GwRlRAh2dhYlTw'
// let fallbackVersion =
//   process.env.MINTTER_HOME_VERSION ||
//   'bafy2bzacednwllikmc7rittnmz4s7cfpo3p2ldsap3bcmgxp7cdpzhoiu5w'

// //https://mintter.com/p/mnoboS11GwRlRAh2dhYlTw?v=bafy2bzacednwllikmc7rittnmz4s7cfpo3p2ldsap3bcmgxp7cdpzhoiu5w

export default function HomePage(props: {pathName: string}) {
  return <PublicationSlugPage pathName={props.pathName} />
}

export const getServerSideProps: GetServerSideProps<
  EveryPageProps & PubSlugPageProps
> = async (context) => {
  return await prepareSlugPage(context, '/')
}
