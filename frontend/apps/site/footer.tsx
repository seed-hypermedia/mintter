import {Button, Container, Footer as TFooter, XStack} from '@mintter/ui'
import {useRouter} from 'next/router'
import {MenuItem} from './menu-item'

export default function Footer() {
  let router = useRouter()
  return null
  return (
    <TFooter>
      <Container
        clearVerticalSpace
        tag="nav"
        aria-label="social"
        marginVertical="$7"
      >
        <XStack space="$3" alignItems="center">
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
      </Container>
    </TFooter>
  )
}
