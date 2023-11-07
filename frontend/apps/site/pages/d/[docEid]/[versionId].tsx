import {getDocStaticProps, siteGetStaticPaths} from 'server/static-props'
import {DocPage} from 'src/doc-page'

export default DocPage

export const getStaticPaths = siteGetStaticPaths

export const getStaticProps = getDocStaticProps
