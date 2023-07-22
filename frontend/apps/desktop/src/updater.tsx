import {listen} from '@app/ipc'
import {Button, SizableText, XStack, YStack} from '@mintter/ui'
import {relaunch} from '@tauri-apps/api/process'
import {
  checkUpdate,
  installUpdate,
  onUpdaterEvent,
  UpdateManifest,
} from '@tauri-apps/api/updater'
import toast from 'react-hot-toast'

checkUpdate()

const TOAST_ID = 'updater'

let ul1: () => void
listen<UpdateManifest>('tauri://update-available', (res) => {
  toast(
    <UpdateAvailable version={res.payload.version} body={res.payload.body} />,
    {duration: Infinity, id: TOAST_ID},
  )
}).then((ul) => (ul1 = ul))

let ul2: () => void
onUpdaterEvent(({error, status}) => {
  switch (status) {
    case 'PENDING':
      toast.loading('Installing Update...', {id: TOAST_ID})
      break
    case 'DONE':
      toast.success(<UpdateSuccess />, {
        duration: Infinity,
        id: TOAST_ID,
      })
      break
    case 'ERROR':
      toast.error(<UpdateError error={error} />, {duration: 8000, id: TOAST_ID})
      break
  }
}).then((ul) => (ul2 = ul))

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    ul1()
    ul2()
  })
}
window.addEventListener('beforeunload', () => {
  ul1()
  ul2()
})

function UpdateAvailable({version, body}: {version: string; body: string}) {
  console.log(
    '🚀 ~ file: updater.tsx:54 ~ UpdateAvailable ~ body:',
    version,
    body,
  )
  return (
    <YStack>
      <SizableText fontWeight="800" size="$2">
        Mintter version {version} is available!
      </SizableText>
      <XStack gap="$3">
        <Button
          size="$1"
          chromeless
          paddingLeft={0}
          onPress={() => installUpdate()}
        >
          Download
        </Button>
        <Button size="$1" chromeless onPress={() => toast.dismiss(TOAST_ID)}>
          Remind me later
        </Button>
      </XStack>
    </YStack>
  )
}

function UpdateSuccess() {
  return (
    <YStack>
      <SizableText fontWeight="800" size="$2">
        Update successful. Restart now?
      </SizableText>
      <XStack gap="$3">
        <Button size="$1" chromeless onPress={() => relaunch()}>
          Restart
        </Button>
        <Button size="$1" chromeless onPress={() => toast.dismiss(TOAST_ID)}>
          no thanks
        </Button>
      </XStack>
    </YStack>
  )
}

function UpdateError({error}: {error?: string}) {
  return (
    <YStack>
      <SizableText fontWeight="800" size="$2">
        Failed to install update!
      </SizableText>
      <pre>{error}</pre>
    </YStack>
  )
}
