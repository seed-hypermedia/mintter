import {GetServerSideProps} from 'next'
import PublicationSlugPage, {PubSlugPageProps} from 'publication-slug-page'
import {EveryPageProps} from './_app'
import {prepareSlugPage} from 'server/page-slug'

export default function PathPublicationPage(props: {pathName: string}) {
  return <PublicationSlugPage pathName={props.pathName} />
}

export const getServerSideProps: GetServerSideProps<
  EveryPageProps & PubSlugPageProps
> = async (context) => {
  const pathName = (context.params?.pageSlug as string) || ''
  return await prepareSlugPage(context, pathName)
}
