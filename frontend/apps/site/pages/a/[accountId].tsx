import {getAccountStaticProps, siteGetStaticPaths} from 'server/static-props'
import AccountPage from 'src/account-page'

export default AccountPage

export const getStaticPaths = siteGetStaticPaths

export const getStaticProps = getAccountStaticProps
