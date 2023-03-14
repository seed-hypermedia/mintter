import {SiteInfo} from '@mintter/shared'
import {GetServerSideProps} from 'next'
import {useRouter} from 'next/router'
import Footer from '../../footer'
import {GatewayHead} from '../../gateway-head'
import {getSiteInfo} from '../../get-site-info'
import {SiteHead} from '../../site-head'

export default function InvitePage({
  hostname,
  siteInfo,
}: {
  hostname: string
  siteInfo: SiteInfo | null
}) {
  const inviteToken = useRouter().query.inviteToken as string
  return (
    <>
      {siteInfo ? (
        <SiteHead siteInfo={siteInfo} title="Invite" />
      ) : (
        <GatewayHead />
      )}
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
      {siteInfo ? null : <Footer />}
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  const siteInfo = await getSiteInfo()
  return {
    props: {
      hostname: process.env.GW_NEXT_HOST,
      siteInfo: siteInfo ? siteInfo.toJson() : null,
    },
  }
}
