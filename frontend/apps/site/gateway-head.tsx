import Head from 'next/head'
import Image from 'next/image'
import {Menu} from '@tamagui/lucide-icons'
import Link from 'next/link'
import {useRouter} from 'next/router'
import {forwardRef, useEffect, useState} from 'react'
import {
  Button,
  useMedia,
  XStack,
  YStack,
  Popover,
  Adapt,
  ParagraphProps,
  Paragraph,
  Separator,
} from '@mintter/ui'
import {Container} from '@mintter/ui'
import {MenuItem} from './menu-item'
import {NextLink} from './next-link'

const SITE_NAME = process.env.GW_SITE_NAME || 'Mintter Site'

export function GatewayHead({title}: {title?: string}) {
  const [open, setOpen] = useState(false)
  let media = useMedia()
  let router = useRouter()

  useEffect(() => {
    const handleRouteChange = () => {
      setOpen(false)
    }
    router.events.on('routeChangeStart', handleRouteChange)
    return () => {
      router.events.off('routeChangeStart', handleRouteChange)
    }
  }, [router.events])
  return (
    <XStack>
      <Head>
        <title>{title ? `${title} | ${SITE_NAME}` : SITE_NAME}</title>
      </Head>
      <Container my="$7" mx="$0" px="$4">
        <XStack ai="center" jc="space-between">
          <Link href="/" aria-label="home page">
            <YStack cur="pointer">
              <Image
                src="/media/MintterLogoBlue.svg"
                alt="Mintter logo"
                width={136}
                height={48}
              />
            </YStack>
          </Link>
          {media.gtSm ? (
            <XStack space="$3" ai="center">
              <MenuItem
                href="https://github.com/mintterteam/mintter"
                target="_blank"
              >
                Github
              </MenuItem>

              <MenuItem href="https://discord.gg/mcUnKENdKX" target="_blank">
                Discord
              </MenuItem>

              <MenuItem href="https://twitter.com/mintterteam" target="_blank">
                Twitter
              </MenuItem>

              <Button onPress={() => router.push('/download')} theme="Button">
                Download
              </Button>
            </XStack>
          ) : (
            <Popover
              open={open}
              onOpenChange={setOpen}
              size="$5"
              stayInFrame={{padding: 20}}
            >
              <Popover.Trigger asChild>
                <YStack
                  $gtMd={{
                    display: 'none',
                  }}
                >
                  <Button
                    size="$3"
                    chromeless
                    noTextWrap
                    onPress={() => setOpen(!open)}
                    theme={open ? 'alt1' : undefined}
                  >
                    <Menu size={20} color="var(--color)" />
                  </Button>
                </YStack>
              </Popover.Trigger>

              <Adapt platform="touch" when="sm">
                <Popover.Sheet zIndex={100000000} modal dismissOnSnapToBottom>
                  <Popover.Sheet.Frame>
                    <Popover.Sheet.ScrollView>
                      <Adapt.Contents />
                    </Popover.Sheet.ScrollView>
                  </Popover.Sheet.Frame>
                  <Popover.Sheet.Overlay zIndex={100} />
                </Popover.Sheet>
              </Adapt>

              <Popover.Content
                bw={1}
                boc="$borderColor"
                enterStyle={{x: 0, y: -10, o: 0}}
                exitStyle={{x: 0, y: -10, o: 0}}
                x={0}
                y={0}
                o={1}
                animation={[
                  'quick',
                  {
                    opacity: {
                      overshootClamping: true,
                    },
                  },
                ]}
                p={0}
                maxHeight="80vh"
                elevate
                zIndex={100000000}
              >
                <Popover.Arrow bw={1} boc="$borderColor" />

                <Popover.ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{flex: 1}}
                >
                  <YStack
                    miw={230}
                    p="$3"
                    ai="flex-end"
                    // display={open ? 'flex' : 'none'}
                  >
                    <NextLink href="/download">
                      <HeadAnchor>Download App</HeadAnchor>
                    </NextLink>
                    <Separator my="$2" w="100%" />
                    <NextLink
                      href="https://github.com/mintterteam/mintter"
                      target="_blank"
                    >
                      <HeadAnchor>Github</HeadAnchor>
                    </NextLink>
                    <NextLink
                      href="https://discord.gg/mcUnKENdKX"
                      target="_blank"
                    >
                      <HeadAnchor>Discord</HeadAnchor>
                    </NextLink>

                    <NextLink
                      href="https://twitter.com/mintterteam"
                      target="_blank"
                    >
                      <HeadAnchor>Twitter</HeadAnchor>
                    </NextLink>
                  </YStack>
                </Popover.ScrollView>
              </Popover.Content>
            </Popover>
          )}
        </XStack>
      </Container>
    </XStack>
  )
}

const HeadAnchor = forwardRef((props: ParagraphProps, ref) => (
  <Paragraph
    ref={ref as any}
    fontFamily="$body"
    px="$3"
    py="$2"
    cursor="pointer"
    size="$5"
    color="$color10"
    hoverStyle={{opacity: 1, color: '$color'}}
    pressStyle={{opacity: 0.25}}
    // @ts-ignore
    tabIndex={-1}
    w="100%"
    // jc="flex-end"
    {...props}
  />
))
