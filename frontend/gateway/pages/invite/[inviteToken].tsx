import {GetServerSideProps} from 'next'
import {useRouter} from 'next/router'
import Footer from '../../footer'
import {GatewayHead} from '../../gateway-head'
import {getSiteTitle} from '../../get-site-info'
import {SiteHead} from '../../site-head'

export default function InvitePage({
  hostname,
  siteTitle,
}: {
  hostname: string
  siteTitle: string | null
}) {
  const inviteToken = useRouter().query.inviteToken as string
  return (
    <>
      {siteTitle ? <SiteHead siteTitle={siteTitle} /> : <GatewayHead />}
      <main
        id="main-content"
        tabIndex={-1}
        className="main-content wrapper text-size-100"
      >
        <h1>Youre invited to {hostname}</h1>
        <ol>
          <li>Download Mintter</li>
          <li>Add Site</li>
          <li>
            Paste this URL: {hostname}/invite/{inviteToken}
          </li>
        </ol>
      </main>
      {siteTitle ? null : <Footer />}
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {
      hostname: process.env.GW_NEXT_HOST,
      siteTitle: await getSiteTitle(),
    },
  }
}
