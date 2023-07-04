import {SiteInfo} from '@mintter/shared'
import {GetServerSideProps} from 'next'
import {useRouter} from 'next/router'
import {
  Container,
  H1,
  XStack,
  YStack,
  Paragraph,
  MainContainer,
  SideContainer,
} from '@mintter/ui'
import Footer from '../../footer'
import {GatewayHead} from '../../gateway-head'
import {getSiteInfo} from '../../get-site-info'
import {SiteHead} from '../../site-head'

export default function InvitePage({
  hostname = 'demo.com',
  siteInfo,
}: {
  hostname: string
  siteInfo: SiteInfo | null
}) {
  const inviteToken = useRouter().query.inviteToken as string
  return (
    <>
      {siteInfo ? (
        <SiteHead siteInfo={siteInfo} title={`Invite to ${hostname}`} />
      ) : (
        <GatewayHead />
      )}
      <Container tag="main" id="main-content" tabIndex={-1}>
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
        <SideContainer></SideContainer>
      </Container>
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
