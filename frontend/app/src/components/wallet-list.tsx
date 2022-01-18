import {styled} from '@app/stitches.config'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {useActor, useInterpret} from '@xstate/react'
import {FormEvent, useRef} from 'react'
import BarcodeScannerComponent from 'react-qr-barcode-scanner'
import {ActorRefFrom} from 'xstate'
import {createWalletMachine, listMachine, listModel, Wallet} from '../wallet-machine'
import {Box} from './box'
import {Button} from './button'
import {dialogContentStyles, DialogTitle, overlayStyles} from './dialog-styles'
import {Text} from './text'
import {TextField} from './text-field'

export function WalletList() {
  // const [data, setData] = useState('Not Found')
  const service = useInterpret(() => listMachine, {devTools: true})
  const [state, send] = useActor(service)
  console.log('list state', state)

  const formRef = useRef<HTMLFormElement>(null)

  function handleWalletSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (formRef.current) {
      const formData = new FormData(formRef.current)
      let name = formData.get('walletName')?.toString()
      let url = formData.get('walletUrl')?.toString()
      if (name && url) {
        send(listModel.events['NEW.WALLET.COMMIT']({name, url}))
      } else {
        console.error('error in form values', {name, url})
      }
    } else {
      console.error('no current form ref: ', formRef.current)
    }
  }

  let {wallets, walletName, walletUrl, errorMessage} = state.context

  return (
    <Box>
      <Box
        css={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Text css={{flex: 1}} size="3" fontWeight="bold">
          Wallets
        </Text>
      </Box>

      <Box
        as="form"
        ref={formRef}
        onSubmit={handleWalletSubmit}
        css={{
          marginVertical: '$4',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '$4',
          padding: '$4',
          border: '1px solid rgba(0,0,0,0.1)',
        }}
      >
        <TextField
          value={walletName}
          onChange={(event) => send(listModel.events['NEW.CHANGE.NAME'](event.target.value))}
          name="walletName"
          label="Name"
          css={{flex: 1}}
        />
        <TextField
          value={walletUrl}
          onChange={(event) => send(listModel.events['NEW.CHANGE.URL'](event.target.value))}
          name="walletUrl"
          label="URL"
          css={{flex: 1}}
        />

        <Button
          size="2"
          type="submit"
          disabled={state.hasTag('pending') || (!state.context.walletName && !state.context.walletUrl)}
        >
          Submit
        </Button>
        <Button
          size="2"
          variant="outlined"
          type="button"
          onClick={() => send(listModel.events['CAMERA.ACTIVATE']())}
          disabled={state.hasTag('pending')}
        >
          ScanQR
        </Button>
      </Box>
      {errorMessage && (
        <Text size="2" color="danger">
          {JSON.stringify(errorMessage)}
        </Text>
      )}
      {state.matches('loading') ? (
        <Text>loading wallets...</Text>
      ) : wallets.length > 0 ? (
        <Box as="ol" css={{listStyleType: 'decimal'}}>
          {wallets.map((wallet: Wallet) => (
            <WalletItem key={wallet.id} walletRef={wallet.ref} />
          ))}
        </Box>
      ) : (
        <Box>
          <Text>No wallets</Text>
        </Box>
      )}
      <CameraDialog
        open={state.matches('camera')}
        onOpenChange={(value) => {
          if (!value) {
            send(listModel.events['CAMERA.CLOSE']())
          }
        }}
      >
        <Content>
          <DialogPrimitive.Title asChild>
            <DialogTitle
              css={{
                height: 64,
                display: 'flex',
                alignItems: 'center',
                paddingHorizontal: '$5',
                borderBottom: '1px solid rgba(0,0,0,0.1)',
                background: '$background-default',
                zIndex: '$max',
              }}
            >
              Scan QR
            </DialogTitle>
          </DialogPrimitive.Title>
          <Box
            css={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BarcodeScannerComponent
              onError={console.error}
              width={340}
              height={340}
              onUpdate={(err, result: any) => {
                if (result) {
                  console.log('scan correct!', result)
                  send(listModel.events['REPORT.CAMERA.SUCCESS'](result.text))
                }
              }}
            />
          </Box>
        </Content>
      </CameraDialog>
      <pre>{JSON.stringify(state.context, null, 2)}</pre>
    </Box>
  )
}

function WalletItem({walletRef}: {walletRef: ActorRefFrom<ReturnType<typeof createWalletMachine>>}) {
  const [state, send] = useActor(walletRef)

  const {name, balanceSats, isDefault, errorMessage} = state.context
  return (
    <Box as="li">
      <Text>
        {name} ({balanceSats} sats){' '}
        {isDefault ? (
          <Text
            size="1"
            css={{
              display: 'inline-block',
              color: 'white',
              backgroundColor: '$success-default',
              paddingHorizontal: '$2',
              paddingVertical: '$1',
            }}
          >
            default
          </Text>
        ) : (
          <Button
            color="muted"
            size="1"
            onClick={() => {
              send('SET_DEFAULT')
            }}
            variant="outlined"
            disabled={state.hasTag('pending')}
          >
            {state.matches('settingDefault') ? '...' : 'set as default'}
          </Button>
        )}{' '}
        <Button
          color="danger"
          size="1"
          onClick={() => {
            send('DELETE')
          }}
          variant="outlined"
        >
          {state.matches('deleting') ? '...' : 'delete'}
        </Button>
      </Text>
      {errorMessage ?? (
        <Text size="1" color="danger">
          {errorMessage}
        </Text>
      )}
    </Box>
  )
}

const StyledOverlay = styled(DialogPrimitive.Overlay, overlayStyles)

function CameraDialog({children, ...props}: DialogPrimitive.DialogProps) {
  return (
    <DialogPrimitive.Root {...props} modal={false}>
      <StyledOverlay />
      {children}
    </DialogPrimitive.Root>
  )
}

var Content = styled(DialogPrimitive.Content, dialogContentStyles, {
  width: '100%',
  maxWidth: '400px',
  maxHeight: '400px',
  height: '100%',
  padding: 0,
  borderRadius: '$3',
  overflow: 'hidden',
})
