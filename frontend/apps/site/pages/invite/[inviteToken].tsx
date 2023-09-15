import {
  Button,
  Check,
  Copy,
  H3,
  PageSection,
  Paragraph,
  SizableText,
  XStack,
  YStack,
} from '@mintter/ui'
import {GetServerSideProps} from 'next'
import {useRouter} from 'next/router'
import {useState} from 'react'
import Footer from '../../footer'
import {getSiteInfo} from '../../get-site-info'
import {SiteHead} from '../../site-head'

export default function InvitePage({
  hostname = 'demo.com',
}: {
  hostname: string
}) {
  const inviteToken = useRouter().query.inviteToken as string
  const [wasPressed, setPress] = useState(false)

  return (
    <YStack flex={1}>
      <SiteHead title={`Invitation to ${hostname}`} />
      <PageSection.Root flex={1}>
        <PageSection.Side />
        <PageSection.Content gap="$8">
          <YStack
            paddingVertical="$7"
            paddingHorizontal="$5"
            borderRadius="$5"
            elevation="$5"
            borderColor="$color7"
            borderWidth={1}
            backgroundColor="$color5"
            gap="$3"
          >
            <SizableText size="$6" fontWeight="800" textAlign="center">
              You got invited to collaborate on this site
            </SizableText>
            <SizableText color="$color9" textAlign="center">
              Please follow the next instructions to add this site to your
              desktop application and start
            </SizableText>
          </YStack>
          <YStack gap="$4">
            <H3>Start here</H3>
            <Paragraph>
              Before you start, make sure you have the Mintter application
              installed. If not, you can click here and download the appropiate
              version for your operating system.
            </Paragraph>
            <Paragraph>
              Once you have your account created, you can go to the settings
              page of your app and open the “Web sites” section
            </Paragraph>
            {/* IMAGE OF SETTINGS */}
            <Paragraph>
              On this section, press the button on the top right corner to add a
              new site. This will open a form with one input, in which you have
              to paste the next invite URL:
            </Paragraph>
            <XStack
              padding="$4"
              borderRadius="$5"
              borderColor="$color7"
              borderWidth={1}
              backgroundColor="$color5"
              alignItems="flex-start"
              gap="$4"
              marginVertical="$4"
            >
              <XStack flexWrap="wrap" flex={1}>
                <SizableText
                  size="$7"
                  fontFamily="$mono"
                  // @ts-expect-error : wordWrap anywhere is not well typed
                  wordWrap="anywhere"
                  userSelect="all"
                >
                  {hostname}invite/{inviteToken}
                </SizableText>
              </XStack>

              <Button
                icon={wasPressed ? Check : Copy}
                color={wasPressed ? '$green10' : ''}
                size="$2"
                onPress={() => {
                  navigator.clipboard.writeText(
                    `${hostname}invite/${inviteToken}`,
                  )
                  setPress(true)
                  setTimeout(() => {
                    setPress(false)
                  }, 1000)
                }}
              />
            </XStack>
            <Paragraph>
              If everything went well, you are now officially a editor for{' '}
              {hostname}. Congrats! 🎉
            </Paragraph>
          </YStack>
        </PageSection.Content>
        <PageSection.Side />
      </PageSection.Root>
      <Footer />
    </YStack>
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
