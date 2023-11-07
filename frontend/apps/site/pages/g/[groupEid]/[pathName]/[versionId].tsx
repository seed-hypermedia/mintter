import {getGroupDocStaticProps, siteGetStaticPaths} from 'server/static-props'
import {GroupDocPage} from 'src/group-doc-page'

export default GroupDocPage

export const getStaticPaths = siteGetStaticPaths

export const getStaticProps = getGroupDocStaticProps
