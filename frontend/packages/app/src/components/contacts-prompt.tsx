import {Button, Dialog, TextArea, XStack} from '@mintter/ui'
import {ComponentProps, useState} from 'react'
import {toast} from 'react-hot-toast'
import {useGRPCClient} from '../app-context'
import {AppDialog, DialogTitle, DialogDescription, useAppDialog} from './dialog'
import {UserPlus} from '@tamagui/lucide-icons'
import {AccessURLRow} from './url'
import {useDaemonInfo} from '../models/daemon'
import {HYPERMEDIA_PUBLIC_WEB_GATEWAY} from '@mintter/shared'

function AddConnectionButton(props: ComponentProps<typeof Button>) {
  return (
    <Button size="$2" {...props} icon={UserPlus}>
      Add Connection
    </Button>
  )
}
function AddConnectionForm(props: {
  onClose: () => void
  input?: string | undefined
}) {
  const [peer, setPeer] = useState('')
  const grpcClient = useGRPCClient()
  const daemonInfo = useDaemonInfo()
  const deviceId = daemonInfo.data?.deviceId
  async function handleConnect(peer: string) {
    props.onClose()
    if (peer) {
      const connectionRegexp = /connect-peer\/([\w\d]+)/
      const parsedConnectUrl = peer.match(connectionRegexp)
      let connectionDeviceId = parsedConnectUrl ? parsedConnectUrl[1] : null
      if (!connectionDeviceId && peer.match(/^(https:\/\/)/)) {
        // in this case, the "peer" input is not https://site/connect-peer/x url, but it is a web url. So lets try to connect to this site via its well known peer id.
        const peerUrl = new URL(peer)
        peerUrl.search = ''
        peerUrl.hash = ''
        peerUrl.pathname = '/.well-known/hypermedia-site'
        const peerWellKnown = peerUrl.toString()
        const wellKnownData = await fetch(peerWellKnown)
          .then((res) => res.json())
          .catch((err) => {
            console.error('Connect Error:', err)
            return null
          })
        if (wellKnownData?.peerInfo?.peerId) {
          connectionDeviceId = wellKnownData.peerInfo.peerId
        } else {
          throw new Error('Failed to connet to web url: ' + peer)
        }
      }
      const addrs = connectionDeviceId
        ? [connectionDeviceId]
        : peer.trim().split(',')

      grpcClient.networking
        .connect({addrs})
        .then(() => {
          toast.success('Connection Added')
        })
        .catch((err) => {
          console.error('Connect Error:', err)
          toast.error('Connection Error : ' + err.rawMessage)
        })
      setPeer('')
    }
  }
  return (
    <>
      <DialogTitle>Add Connection</DialogTitle>

      {props.input ? (
        <>
          <DialogDescription>
            Confirm connection to "{props.input.slice(0, 6)}...
            {props.input.slice(-6)}"
          </DialogDescription>
          <Button onPress={() => handleConnect(props.input)} icon={UserPlus}>
            Connect
          </Button>
        </>
      ) : (
        <>
          <DialogDescription>
            Share your device connection URL with your friends:
          </DialogDescription>
          {deviceId && (
            <AccessURLRow
              url={`${HYPERMEDIA_PUBLIC_WEB_GATEWAY}/connect-peer/${deviceId}`}
            />
          )}
          <DialogDescription>
            Paste other people&apos;s connection URL here:
          </DialogDescription>
          <TextArea
            value={peer}
            onChangeText={setPeer}
            multiline
            numberOfLines={4}
            data-testid="add-contact-input"
          />
          <DialogDescription size={'$1'}>
            You can also paste the full peer address here.
          </DialogDescription>
          <XStack>
            <Button
              onPress={() => handleConnect(peer)}
              disabled={!peer}
              icon={UserPlus}
            >
              Connect
            </Button>
          </XStack>
        </>
      )}
    </>
  )
}

export function useConfirmConnection() {
  return useAppDialog<string>(AddConnectionForm)
}
export function useAddConnection() {
  return null
}

export function ContactsPrompt() {
  return (
    <AppDialog
      TriggerComponent={AddConnectionButton}
      ContentComponent={AddConnectionForm}
    />
  )
}
