import {Account, Publication} from '@mintter/shared'
import {
  Button,
  Dialog,
  Info,
  Input,
  Label,
  ListItem,
  Help,
  RadioGroup,
  Separator,
  SizableText,
  SizeTokens,
  Slider,
  SliderProps,
  User,
  XStack,
  YGroup,
  YStack,
  Card,
  ErrorIcon,
} from '@mintter/ui'
import {useEffect, useState} from 'react'
import {toast} from 'react-hot-toast'
import QRCode from 'react-qr-code'

const options = [
  {value: '100', label: '100 sats'},
  {value: '500', label: '500 sats'},
  {value: 'other', label: 'Other'},
]

export function WebTipping({
  publication,
  author,
  editors = [],
}: {
  publication: Publication
  author: Account | null
  editors: Array<Account> | null
}) {
  const [option, setOption] = useState<string | null>(null)
  const [amount, setAmount] = useState(0)
  const [invoice, setInvoice] = useState<string | null>(null)
  const [open, onOpenChange] = useState<boolean>(false)
  const [error, setError] = useState('')
  const [localEditors] = useState(() =>
    editors?.length ? editors : author ? [author] : [],
  )

  /**
   *
   * tests:
   * - editors ? url should be with the whole editors
   * - no editors ? url should have author
   */

  function handleOptionChange(optionValue) {
    let selectedOption = options.find((o) => o.value == optionValue)
    if (selectedOption) {
      setOption(optionValue)
      setAmount(() =>
        optionValue == 'other' ? amount : Number(selectedOption?.value),
      )
    }
  }

  async function handlePayment() {
    if (!publication.document) {
      setError('no publication')
      return
    }
    if (amount <= 0) {
      setError('min amount is 1sat')
      return
    }

    let {id} = publication.document
    let percentage = localEditors.length ? 1 / localEditors.length : 1

    let editorsUri = localEditors.length
      ? localEditors
          .map((e) => (e ? `&user=${e.id},${percentage}` : ''))
          .join('')
      : `&user=${publication.document.author},${percentage}`

    try {
      let res = await fetch(
        `https://ln.testnet.mintter.com/v2/invoice?source=${id}${editorsUri}&amount=${
          amount * 1000
        }`,
      )
      let resp = await res.json()
      if (!resp.pr) {
        setError(resp.reason)
      } else {
        setInvoice(resp.pr)
        onOpenChange(true)
      }
    } catch (error) {
      setError(error.reason)
    }
  }

  if (localEditors.length == 0) {
    console.error(
      `no editors nor author in this publication', ${JSON.stringify({
        author,
        editors,
        publication,
      })}`,
    )
    return null
  }

  return (
    <>
      <YGroup borderWidth={1} borderColor="$borderColor">
        <YGroup.Item>
          <YStack padding="$3" gap="$3">
            <XStack gap="$2" alignItems="center">
              <SizableText size="$4" fontWeight="700">
                Tip Authors
              </SizableText>
              <Dialog>
                <Dialog.Trigger asChild>
                  <Button size="$2" chromeless icon={Info} />
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay
                    animation="quick"
                    opacity={0.8}
                    enterStyle={{opacity: 0}}
                    exitStyle={{opacity: 0}}
                  />
                  <Dialog.Content
                    bordered
                    elevate
                    key="content"
                    maxWidth={500}
                    animation={[
                      'quick',
                      {
                        opacity: {
                          overshootClamping: true,
                        },
                      },
                    ]}
                    enterStyle={{x: 0, y: -20, opacity: 0, scale: 0.9}}
                    exitStyle={{x: 0, y: 10, opacity: 0, scale: 0.95}}
                    space
                  >
                    <Dialog.Title>Tipping Authors</Dialog.Title>
                    <Dialog.Description>
                      By making a payment, you are supporting the publication
                      and its editors. Your payment will be distributed equally
                      among all editors, helping to fund their work and ensure
                      the ongoing success of the publication.
                    </Dialog.Description>
                    <Button>Thank you for your support!</Button>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog>
            </XStack>
            <Separator />
            <RadioGroup name="form" onValueChange={handleOptionChange}>
              <RadioGroupItemWithLabel value="100" label="100 Sats" />
              <RadioGroupItemWithLabel value="500" label="500 Sats" />
              <RadioGroupItemWithLabel value="other" label="Other" />
            </RadioGroup>
            {option == 'other' && (
              <Input
                placeholder="XXX Sats"
                keyboardType="number-pad"
                value={String(amount)}
                onChangeText={(val) => setAmount(Number(val))}
              />
            )}
            <YStack>
              <XStack gap="$2" alignItems="center">
                <SizableText size="$1" color="$color9">
                  how payments are distributed?
                </SizableText>
                <Dialog>
                  <Dialog.Trigger asChild>
                    <Button size="$2" chromeless icon={Help} />
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay
                      animation="quick"
                      opacity={0.8}
                      enterStyle={{opacity: 0}}
                      exitStyle={{opacity: 0}}
                    />
                    <Dialog.Content
                      bordered
                      elevate
                      key="content"
                      maxWidth={500}
                      animation={[
                        'quick',
                        {
                          opacity: {
                            overshootClamping: true,
                          },
                        },
                      ]}
                      enterStyle={{x: 0, y: -20, opacity: 0, scale: 0.9}}
                      exitStyle={{x: 0, y: 10, opacity: 0, scale: 0.95}}
                      space
                    >
                      <Dialog.Title>Payment Distribution</Dialog.Title>
                      <Dialog.Description>
                        Currently payments are distributed equally between all
                        the editors of the current publication. In the future we
                        will let payers to set custom distribution and even
                        exact amounts per editor
                      </Dialog.Description>
                      <Button>Learn moar about payments in Mintter</Button>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog>
              </XStack>
              {localEditors.length && (
                <YGroup
                  borderRadius="$3"
                  hoverTheme
                  borderWidth={1}
                  borderColor="$borderColor"
                  separator={<Separator />}
                >
                  {localEditors.map((editor) => (
                    <YGroup.Item>
                      <ListItem
                        size="$2"
                        paddingHorizontal="$3"
                        title={editor.profile?.alias}
                        iconAfter={
                          <SizableText
                            size="$1"
                            paddingVertical="$2"
                            overflow="hidden"
                            whiteSpace="nowrap"
                            textOverflow="ellipsis"
                            opacity={0.6}
                          >
                            ...{editor.id.substring(editor.id.length - 10)}
                          </SizableText>
                        }
                        icon={User}
                        hoverTheme
                        backgroundColor="$backgroundStrong"
                        hoverStyle={{
                          backgroundColor: '$backgroundActive',
                        }}
                      />
                    </YGroup.Item>
                  ))}
                </YGroup>
              )}
            </YStack>
          </YStack>
        </YGroup.Item>

        <YGroup.Item>
          <YStack>
            {invoice && (
              <Button chromeless size="$2" onPress={() => onOpenChange(true)}>
                view invoice
              </Button>
            )}
            {error && (
              <Card theme="red" margin="$2" borderRadius="$1">
                <XStack
                  space
                  alignItems="center"
                  paddingHorizontal="$3"
                  paddingVertical="$1"
                >
                  <ErrorIcon size={12} />
                  <SizableText theme="red" size="$2">
                    {error}
                  </SizableText>
                </XStack>
              </Card>
            )}
            <Button theme="green" onPress={handlePayment}>
              Tip
            </Button>
          </YStack>
        </YGroup.Item>
      </YGroup>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay
            animation="quick"
            opacity={0.8}
            enterStyle={{opacity: 0}}
            exitStyle={{opacity: 0}}
          />
          <Dialog.Content
            bordered
            elevate
            key="content"
            animation={[
              'quick',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{x: 0, y: -20, opacity: 0, scale: 0.9}}
            exitStyle={{x: 0, y: 10, opacity: 0, scale: 0.95}}
            space
          >
            <Dialog.Title>Here's your invoice!</Dialog.Title>
            <Dialog.Description>
              Now scan this with your wallet and pay to the creators!
            </Dialog.Description>
            <YStack
              padding="$3"
              gap="$3"
              alignItems="center"
              justifyContent="center"
            >
              {invoice && <QRCode size={400} value={invoice} />}
              <Button
                chromeless
                onPress={() => {
                  if (!invoice) return
                  navigator.clipboard.writeText(invoice)
                  toast.success('Copied Invoice correctly!')
                }}
              >
                or <SizableText fontWeight="700">Copy</SizableText> the invoice
                and pay it however you want
              </Button>
            </YStack>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  )
}

function RadioGroupItemWithLabel({
  value,
  size = '$3',
  label,
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
        {label}
      </Label>
    </XStack>
  )
}

interface SliderValue {
  id: string
  value: number
}

const MAX_TOTAL_VALUE = 100

const SliderList = ({editors}: {editors: Array<string>}) => {
  const [sliders, setSliders] = useState<Array<SliderValue>>(() =>
    editors.map((e) => ({
      id: e,
      value: 1 / editors.length,
    })),
  )

  const handleChange = (id: string, value: number) => {
    // Calculate the sum of all slider values
    const sum = sliders.reduce((acc, cur) => {
      if (cur.id == id) {
        return acc + value
      }
      return acc + cur.value
    }, 0)
    console.log('🚀 ~ file: web-tipping.tsx:211 ~ sum ~ sum:', sum)

    // Calculate the new values for all sliders
    const newSliders = sliders.map((slider) => {
      if (slider.id === id) {
        return {id, value}
      }
      const newValue =
        Math.round(((100 - value) / (sliders.length - 1)) * 100) / 100
      return {...slider, value: newValue}
    })

    setSliders(newSliders)
  }

  return (
    <div>
      {sliders.map((slider) => (
        <div key={slider.id}>
          <SimpleSlider
            min={0}
            max={100}
            width={200}
            value={slider.value}
            onValueChange={(val) => {
              handleChange(slider.id, val)
            }}
          />
          <p>{slider.value}%</p>
        </div>
      ))}
    </div>
  )
}

function SimpleSlider({children, ...props}: SliderProps) {
  return (
    <Slider defaultValue={[50]} max={100} step={1} {...props}>
      <Slider.Track>
        <Slider.TrackActive />
      </Slider.Track>
      <Slider.Thumb index={0} circular elevate />
      {children}
    </Slider>
  )
}
