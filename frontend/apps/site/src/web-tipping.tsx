import {HMAccount} from '@mintter/shared/src/json-hm'
import {
  Button,
  Dialog,
  Input,
  Label,
  RadioGroup,
  Separator,
  SideSection,
  SizableText,
  SizeTokens,
  Spinner,
  Text,
  XGroup,
  XStack,
  YStack,
} from '@mintter/ui'
import {Check, MinusCircle, PlusCircle, X, Zap} from '@tamagui/lucide-icons'
import Link from 'next/link'
import React, {
  PropsWithChildren,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {toast} from 'react-hot-toast'
import QRCode from 'react-qr-code'
import {AccountRow} from 'src/account-row'
import {trpc} from './trpc'

const options: {value: string; label: string; sats: number | null}[] = [
  {value: '100', label: '100 sats', sats: 100},
  {value: '500', label: '500 sats', sats: 500},
  {value: 'other', label: 'Other', sats: null},
]

async function sendWeblnPayment(invoice: string) {
  // @ts-ignore
  if (typeof window.webln !== 'undefined') {
    // @ts-ignore

    await window.webln.enable()
    // @ts-ignore
    return await window.webln.sendPayment(invoice)
  }
}

const isTouchDevice =
  'ontouchstart' in (global.window || {}) ||
  global.navigator?.maxTouchPoints > 0 ||
  // @ts-expect-error
  global.navigator?.msMaxTouchPoints > 0

export function WebTipping({
  docId,
  editors = [],
  children,
}: PropsWithChildren<{
  docId?: string
  editors: Array<HMAccount | string | null>
}>) {
  const [open, onOpenChange] = useState<boolean>(false)

  return (
    <SideSection>
      {docId && (
        <DontationDialog
          open={open}
          onOpenChange={onOpenChange}
          docId={docId}
          editors={editors}
        />
      )}
      <Button
        onPress={() => onOpenChange(true)}
        size="$2"
        chromeless
        icon={Zap}
        theme="green"
      >
        <XStack flex={1}>
          <SizableText size="$2">Donate Bitcoin</SizableText>
        </XStack>
      </Button>
      {children}
    </SideSection>
  )
}

function AmountForm({
  amount,
  onAmount,
}: {
  amount: number
  onAmount: (amount: number) => void
}) {
  let option = options.find((o) => o.sats == amount)?.value || 'other'
  const [isOtherInputing, setIsOtherInputing] = useState<boolean>(false)
  let isOther = option === 'other' || isOtherInputing
  return (
    <YStack backgroundColor={'$green5'} borderRadius="$3" padding="$3" gap="$3">
      <Text fontSize="$6" fontWeight="bold" theme="green">
        Payment Amount
      </Text>
      <RadioGroup
        name="form"
        onValueChange={(val) => {
          const definedSats = options.find((o) => o.value == val)?.sats || 0
          setIsOtherInputing(!definedSats)
          if (definedSats) {
            setIsOtherInputing(false)
            onAmount(definedSats)
          } else {
            setIsOtherInputing(true)
          }
        }}
        value={isOther ? 'other' : option}
      >
        <RadioGroupItemWithLabel value="100" label="100 Sats" />
        <RadioGroupItemWithLabel value="500" label="500 Sats" />
        <XStack width={300} alignItems="center" space="$4">
          <RadioGroup.Item value={'other'} id="other" size="$3">
            <RadioGroup.Indicator />
          </RadioGroup.Item>
          <Label size={'$3'} htmlFor="other">
            <SizableText>Other</SizableText>
          </Label>
          {isOther && (
            <XGroup>
              <XGroup.Item>
                <Input
                  autoFocus
                  size="$2"
                  maxWidth={62}
                  placeholder="XXX Sats"
                  keyboardType="number-pad"
                  value={String(amount)}
                  onChangeText={(val) => onAmount(Number(val))}
                />
              </XGroup.Item>
              <XGroup.Item>
                <Text margin="$1" paddingHorizontal="$2" fontSize="$2">
                  Sats
                </Text>
              </XGroup.Item>
            </XGroup>
          )}
        </XStack>
      </RadioGroup>
    </YStack>
  )
}

function SplitRow({
  sats,
  id,
  percentage,
  dispatchSplit,
  canReceive,
}: {
  sats: number
  id: string
  percentage: number
  dispatchSplit?: React.Dispatch<SplitAction>
  canReceive: boolean
}) {
  const [isHovering, setIsHovering] = useState<boolean>(false)
  const displayIncrementButton = isHovering || isTouchDevice
  return (
    <XStack
      overflow="hidden"
      onHoverIn={() => setIsHovering(true)}
      onHoverOut={() => setIsHovering(false)}
      justifyContent="space-between"
    >
      <XStack gap="$2">
        <AccountRow account={id} />
        <Text color="$gray10">– {Math.round(percentage * 1000) / 10}%</Text>
      </XStack>
      <XStack gap="$2">
        {dispatchSplit && canReceive ? (
          <XGroup opacity={displayIncrementButton ? 1 : 0} size="$2">
            <XGroup.Item>
              <Button
                size="$2"
                icon={MinusCircle}
                onPress={() => {
                  dispatchSplit({
                    type: 'incrementPercentage',
                    id,
                    increment: -0.1,
                  })
                }}
              />
            </XGroup.Item>
            <XGroup.Item>
              <Button
                size="$2"
                icon={PlusCircle}
                onPress={() => {
                  dispatchSplit({
                    type: 'incrementPercentage',
                    id,
                    increment: 0.1,
                  })
                }}
              />
            </XGroup.Item>
          </XGroup>
        ) : null}
        {canReceive ? (
          <Text>{sats} Sats</Text>
        ) : (
          <Text color="$color8">No Lightning Wallet</Text>
        )}
      </XStack>
    </XStack>
  )
}

function RadioGroupItemWithLabel({
  value,
  label,
  size = '$3',
}: {
  value: string
  label: string
  size?: SizeTokens
}) {
  const id = `radiogroup-${value}`
  return (
    <XStack width={300} alignItems="center" space="$4">
      <RadioGroup.Item value={value} id={id} size={size}>
        <RadioGroup.Indicator />
      </RadioGroup.Item>

      <Label size={size} htmlFor={id}>
        <SizableText>{label}</SizableText>
      </Label>
    </XStack>
  )
}

type InvoiceSplit = {id: string; percentage: number; canReceive: boolean}[]

type SplitAction = {
  type: 'incrementPercentage'
  increment: number
  id: string
}
let editorsOverallPercentage = 0.99

function splitReducer(state: InvoiceSplit, action: SplitAction): InvoiceSplit {
  const availRecipients = state.filter((s) => s.canReceive)
  if (action.type === 'incrementPercentage') {
    const prevTarget = state.find((s) => s.id === action.id)
    if (!prevTarget) return state

    const prevTargetPercentage = prevTarget.percentage
    const nextPercentage = Math.min(
      editorsOverallPercentage,
      Math.max(0, prevTargetPercentage + action.increment),
    )
    const prevRemainderPercentage =
      editorsOverallPercentage - prevTargetPercentage
    const nextRemainderPercentage = editorsOverallPercentage - nextPercentage

    if (
      !state.filter((s) => s.id !== action.id).find((s) => s.percentage !== 0)
    ) {
      return state.map((s) => {
        if (!s.canReceive) return s
        if (s.id === action.id) {
          return {...s, id: s.id, percentage: nextPercentage}
        }
        const percentage =
          nextRemainderPercentage / (availRecipients.length - 1)
        return {...s, id: s.id, percentage}
      })
    }
    return state.map((s) => {
      if (s.id === action.id) {
        return {...s, id: s.id, percentage: nextPercentage}
      }

      // these split the remainder based on their ratio from the previous remainder
      const prevRatioExcludingTarget =
        prevRemainderPercentage === 0
          ? 0
          : s.percentage / prevRemainderPercentage
      const percentage = prevRatioExcludingTarget * nextRemainderPercentage
      return {...s, id: s.id, percentage}
    })
  }
  return state
}

function useRecipientsQuery(recipients: Array<HMAccount | string | null>) {
  return trpc.wallets.getAccountsAvailable.useQuery(
    recipients.map((recipient) => {
      if (typeof recipient === 'string') return recipient
      if (!recipient) return null
      return recipient.id
    }),
  )
}

function CreateInvoiceStep({
  onInvoice,
  onComplete,
  editors,
  docId,
  validRecipients,
}: {
  onInvoice: (invoice: InternalInvoice) => void
  onComplete: (complete: boolean) => void
  editors: Array<HMAccount | string | null>
  validRecipients: string[]
  docId: string
}) {
  let [amount, setAmount] = useState(100)
  let initialSplit = useMemo(() => {
    let editorIds = editors
      .map((editor) => {
        if (editor === null) return ''
        let editorId = typeof editor != 'string' ? editor.id : editor
        return editorId
      })
      .filter((editorId) => !!editorId)
    let equalPercentage = validRecipients.length
      ? editorsOverallPercentage / validRecipients.length
      : editorsOverallPercentage
    return editorIds.map((id) => {
      const canReceive = !!id && validRecipients.indexOf(id) !== -1
      if (!canReceive) return {id, canReceive, percentage: 0}
      return {id, canReceive, percentage: equalPercentage}
    })
  }, [editors, validRecipients])
  let [split, dispatchSplit] = useReducer(splitReducer, initialSplit)
  console.log({initialSplit, split})
  let computed = useMemo(() => {
    let remainderSats = amount
    let remainderPercent = 1
    let computedSplit = split.map((splitRow) => {
      let sats = Math.floor(amount * splitRow.percentage)
      remainderSats -= sats
      remainderPercent -= splitRow.percentage
      return {...splitRow, sats, percentage: sats / amount}
    })
    // TO DO: handle edge case where remainderSats is 0 but the actual service fee should be at least 1 sat
    return {
      computedSplit,
      total: amount,
      serviceFeePercent: remainderPercent,
      serviceFeeSats: remainderSats,
    }
  }, [split, amount])

  async function createInvoice() {
    if (amount <= 0) {
      throw new Error('min amount is 1sat')
    }
    if (!split.length) {
      throw new Error('invalid donation share: empty')
    }
    let editorsUri = split
      .map((split) => `&user=${split.id},${split.percentage}`)
      .join('')
    let res = await fetch(
      `${
        process.env.NEXT_PUBLIC_LN_HOST || ''
      }/v2/invoice?source=${docId}${editorsUri}&amount=${amount * 1000}`,
    )
    let resp = await res.json()
    console.log('Made Invoice', resp)
    if (!resp.pr) {
      throw new Error('Could not create invoice: ' + resp.reason)
    } else {
      onInvoice({
        payload: resp.pr,
        hash: resp.payment_hash,
        split,
      } as InternalInvoice)
      sendWeblnPayment(resp.pr)
        .then((output) => {
          console.log('Done Paying with webln', output)
          if (!output) return
          onComplete(true)
        })
        .catch((e) => {
          console.error('wallet pay fail', e)
        })
    }
  }
  const noRecipients = validRecipients?.length === 0
  return (
    <>
      <Dialog.Title>Donate to Authors</Dialog.Title>
      <Dialog.Close asChild>
        <Button
          position="absolute"
          top="$3"
          right="$3"
          size="$2"
          circular
          icon={X}
        />
      </Dialog.Close>
      <YStack gap="$4" marginTop="$4">
        <Dialog.Description>
          By making a payment, you are supporting the publisher and its editors,
          helping to fund their work and ensure the ongoing success of the
          publication.
        </Dialog.Description>
        <Dialog.Description>
          Payments are made using the instant and global Bitcoin Lightning
          network. All amounts are in{' '}
          <Link
            href="https://www.investopedia.com/terms/s/satoshi.asp"
            target="_blank"
          >
            Satoshis
          </Link>
        </Dialog.Description>
        {!noRecipients ? (
          <AmountForm amount={amount} onAmount={setAmount} />
        ) : null}
        {!noRecipients ? (
          <YStack
            borderRadius="$3"
            padding="$3"
            gap="$3"
            borderWidth={1}
            borderColor={'$gray8'}
          >
            <Text fontSize="$6" fontWeight="bold">
              Distribution Overview
            </Text>
            {computed.computedSplit.map(
              (splitRow: {
                id: string
                canReceive: boolean
                sats: number
                percentage: number
              }) => {
                return (
                  <SplitRow
                    key={splitRow.id}
                    {...splitRow}
                    dispatchSplit={
                      computed.computedSplit.length > 1
                        ? dispatchSplit
                        : undefined
                    }
                  />
                )
              },
            )}

            <XStack overflow="hidden">
              <YStack width={600}>
                <Text flex={1}>Transaction Fee</Text>
              </YStack>
              <YStack>
                <Text>{computed.serviceFeeSats} Sats</Text>
              </YStack>
            </XStack>
            <Separator />
            <XStack overflow="hidden">
              <YStack width={600}>
                <Text color="$green11" flex={1}>
                  Payment Total
                </Text>
              </YStack>
              <YStack>
                <Text color="$green11">{computed.total} Sats</Text>
              </YStack>
            </XStack>
          </YStack>
        ) : null}
        <XStack justifyContent="center">
          {noRecipients ? (
            <SizableText color="$color10">
              No Lightning Recipients Available
            </SizableText>
          ) : (
            <Button
              theme="green"
              onPress={() => {
                createInvoice()
              }}
              icon={Zap}
            >
              Start Bitcoin Donation
            </Button>
          )}
        </XStack>
      </YStack>
    </>
  )
}

type InternalInvoice = {
  payload: string
  hash: string
  split: {id: string; percentage: number}[]
}

async function checkInvoice(invoice: InternalInvoice) {
  const userId = invoice.split[0]?.id
  if (!userId) throw new Error('Invalid invoice, no user id')
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_LN_HOST || ''}/v2/invoicemeta/${
      invoice.hash
    }?user=${userId}`,
  )
  // @juligasa this response returns a 404 before the invoice is paid. after the invoice is paid the output looks like this:
  // {
  //   "payment_hash": "",
  //   "payment_request": "",
  //   "description": "",
  //   "destination": "",
  //   "amount": 0,
  //   "fee": 0,
  //   "status": "settled",
  //   "type": "sub_invoice",
  //   "settled_at": "2023-06-01T19:08:28.982444Z",
  //   "expires_at": "2023-06-02T19:08:12.075875Z",
  //   "is_paid": false,
  //   "keysend": false,
  //   "custom_records": {
  //     "543467923": "eyJzb3VyY2UiOiJVQ3ZjWDkyZUV1UHZnd2UwakY0VkdZIiwiYXV0aG9ycyI6eyJ6Nk1raTIyYm5ma0xreVRHUW5mZjZ0V2pxTkpvRnhuaTZuUUJZWW9wS3NqM3NqOFYiOjAuNDk1LCJ6Nk1rdUMzU0p0cHRDc3FmWU1mQXN3cVFlWGJjTHdFYnNDUkVEcVdRZGp6NmVDelUiOjAuNDk1fX0="
  //   }
  // }

  if (res.status !== 200) return {status: 'incomplete'}
  const invoiceResponse = await res.json()
  console.log('Invoice Response', invoiceResponse)
  // isPaid is false for some reason even though the payment is complete, so we just check status.settled here
  if (invoiceResponse?.status === 'settled') return {status: 'complete'}
  return {status: 'incomplete'}
}

function PayInvoiceStep({
  invoice,
  onComplete,
}: {
  invoice: InternalInvoice
  onComplete: (complete: boolean) => void
}) {
  let interval = useRef<null | ReturnType<typeof setInterval>>(null)
  useEffect(() => {
    interval.current = setInterval(() => {
      checkInvoice(invoice)
        .then((out) => {
          if (out.status === 'complete') {
            console.log('Invoice Completed')

            onComplete(true)
            interval.current && clearInterval(interval.current)
          }
        })
        .catch((e) => {
          console.error('checkInvoice error')
        })
    }, 1_500)
    return () => {
      interval.current && clearInterval(interval.current)
    }
  }, [invoice, onComplete])

  return (
    <>
      <Dialog.Title>Here&apos;s your invoice!</Dialog.Title>
      <Dialog.Description>
        Now scan this with your wallet and pay to the creators!
      </Dialog.Description>
      <YStack padding="$3" gap="$3" alignItems="center" justifyContent="center">
        {invoice && (
          <YStack height="auto" maxWidth={400} alignSelf="center" width="100%">
            <QRCode
              size={256}
              style={{height: 'auto', maxWidth: '100%', width: '100%'}}
              value={invoice.payload}
              viewBox={`0 0 256 256`}
            />
          </YStack>
        )}
        <Button
          chromeless
          onPress={() => {
            if (!invoice) return
            navigator.clipboard.writeText(invoice.payload)
            toast.success('Copied Invoice correctly!')
          }}
        >
          copy invoice
        </Button>
      </YStack>
    </>
  )
}

function CompletionStep({onClose}: {onClose: () => void}) {
  return (
    <YStack gap="$3" padding="$3">
      <Dialog.Title>Thank you for donating!</Dialog.Title>
      <Text fontSize={100} textAlign="center">
        🎉
      </Text>
      <Button onPress={onClose} icon={Check}>
        Close
      </Button>
    </YStack>
  )
}

function DontationDialog({
  open,
  onOpenChange,
  docId,
  editors,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  docId: string
  editors: Array<HMAccount | string | null>
}) {
  let [invoice, setInvoice] = useState<InternalInvoice | null>(null)
  let [completion, setCompletion] = useState<boolean>(false)
  const validRecipients = useRecipientsQuery(editors)

  let content = validRecipients.data ? (
    <CreateInvoiceStep
      onInvoice={setInvoice}
      docId={docId}
      editors={editors}
      validRecipients={validRecipients.data}
      onComplete={setCompletion}
    />
  ) : (
    <Spinner />
  )
  if (completion) {
    content = (
      <CompletionStep
        onClose={() => {
          onOpenChange(false)
          setInvoice(null)
          setCompletion(false)
        }}
      />
    )
  } else if (invoice) {
    content = <PayInvoiceStep invoice={invoice} onComplete={setCompletion} />
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setInvoice(null)
          setCompletion(false)
        }
        onOpenChange(isOpen)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          animation="fast"
          opacity={0.8}
          enterStyle={{opacity: 0}}
          exitStyle={{opacity: 0}}
        />
        <Dialog.Content
          animation={[
            'fast',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          maxWidth="90vw"
          maxHeight="90vh"
          margin={20}
          overflow="scroll"
          x={0}
          y={0}
          enterStyle={{x: 0, y: -20, opacity: 0, scale: 0.9}}
          exitStyle={{x: 0, y: 10, opacity: 0, scale: 0.95}}
        >
          {content}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
