import {useState, useEffect} from 'react'
import {useRouter} from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import {XStack, YStack, isClient, Text, Button} from 'tamagui'
import {Container} from './container'
import {MenuItem} from './menu-item'

const SITE_NAME = process.env.GW_SITE_NAME || 'Mintter Site'

export function GatewayHead({title}: {title?: string}) {
  let router = useRouter()
  return (
    <XStack
    // bbc="$borderColor"
    // zi={50000}
    // @ts-ignore
    // pos="fixed"
    // top={0}
    // my={0}
    // left={0}
    // right={0}
    // elevation={'$1'}
    // py={'$2'}
    >
      <Head>
        <title>{title ? `${title} | ${SITE_NAME}` : SITE_NAME}</title>
      </Head>
      <Container my="$7">
        <XStack ai="center" jc="space-between">
          <Link href="/" aria-label="home page">
            <YStack cur="pointer">
              <Image
                src="/logo-blue.svg"
                alt="Mintter logo"
                width={136}
                height={48}
              />
            </YStack>
          </Link>
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
        </XStack>
      </Container>
    </XStack>
  )
}
