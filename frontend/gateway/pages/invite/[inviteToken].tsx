import {GetServerSideProps} from 'next'
import {useRouter} from 'next/router'
import Footer from '../../footer'
import {SiteHead} from '../../site-head'

export default function InvitePage({hostname}: {hostname: string}) {
  const inviteToken = useRouter().query.inviteToken as string
  return (
    <>
      <SiteHead />
      <main
        id="main-content"
        tabIndex={-1}
        className="main-content wrapper text-size-100"
      >
        <h1>You're invited to "{hostname}"</h1>
        <ol>
          <li>Download Mintter</li>
          <li>Add Site</li>
          <li>
            Paste this URL: https://{hostname}/invite/{inviteToken}
          </li>
        </ol>
      </main>
      <Footer />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {
      hostname: process.env.NEXT_HOST,
    },
  }
}
