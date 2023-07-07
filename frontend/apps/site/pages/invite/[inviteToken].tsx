import {GetServerSideProps} from 'next'
import {useRouter} from 'next/router'
import {H1, XStack, YStack, Paragraph, MainContainer} from '@mintter/ui'
import Footer from '../../footer'
import {getSiteInfo} from '../../get-site-info'
import {SiteHead} from '../../site-head'

export default function InvitePage({
  hostname = 'demo.com',
}: {
  hostname: string
}) {
  const inviteToken = useRouter().query.inviteToken as string
  return (
    <>
      <SiteHead title={`Invite to ${hostname}`} />
      <MainContainer>
        <H1>You&apos;re invited to {hostname}</H1>
        <YStack tag="ol">
          <XStack tag="li" className="list-item item-decimal">
            <Paragraph size={'$8'}>Download Mintter</Paragraph>
          </XStack>
          <XStack className="list-item item-decimal" tag="li">
            <Paragraph size={'$8'}>Add Site</Paragraph>
          </XStack>
          <XStack className="list-item item-decimal" tag="li">
            <Paragraph size={'$8'}>
              Paste this URL: {hostname}/invite/{inviteToken}
            </Paragraph>
          </XStack>
        </YStack>
      </MainContainer>
      <Footer />
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
