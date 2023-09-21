import {GetServerSideProps} from 'next'
import {PubSlugPageProps} from 'publication-slug-page'
import {EveryPageProps} from './_app'
import GroupPublicationPage from './g/[groupEid]/[pathName]'
import {getSiteGroup} from 'server/site-info'
import {getGroupPathNamePageProps, getGroupView} from 'server/group'

const PathPublicationPage = GroupPublicationPage
export default PathPublicationPage

export const getServerSideProps: GetServerSideProps<
  EveryPageProps & PubSlugPageProps
> = async (context) => {
  const pathName = (context.params?.pathName as string) || ''
  const {groupEid, version} = await getSiteGroup()
  if (!groupEid) return {notFound: true}
  return await getGroupPathNamePageProps({
    groupEid,
    version,
    pathName,
    context,
  })
}
