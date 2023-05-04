import {Publication} from '@mintter/shared'
import {useState} from 'react'
import {
  Button,
  Fieldset,
  Info,
  Input,
  Label,
  Popover,
  RadioGroup,
  Select,
  Separator,
  SizableText,
  SizeTokens,
  XStack,
  YGroup,
  YStack,
} from '@mintter/ui'

const options = [
  {value: '100', label: '100 sats'},
  {value: '500', label: '500 sats'},
  {value: 'other', label: 'Other'},
]

export function WebTipping({publication}: {publication: Publication}) {
  const [option, setOption] = useState<string | null>(null)
  const [amount, setAmount] = useState(0)
  const [invoice, setInvoice] = useState<string | null>(null)

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
    if (!publication.document) return
    let {editors, id} = publication.document
    let percentage = 1 / editors.length

    let editorsUri = editors.map((e) => `&user=${e},${percentage}`).join('')

    let res = await fetch(
      `https://ln.testnet.mintter.com/v2/invoice?source=${id}${editorsUri}&amount=${
        amount * 1000
      }`,
    )
    let resp = await res.json()
    console.log('🚀 ~ file: web-tipping.tsx:54 ~ handlePayment ~ resp:', resp)
    setInvoice(resp.pr)
  }

  return (
    <YGroup borderWidth={1} borderColor="$borderColor">
      <YGroup.Item>
        <YStack padding="$3" gap="$3">
          <XStack gap="$2">
            <SizableText size="$4" fontWeight="700" flex={1}>
              Tip Authors
            </SizableText>
            <Popover placement="bottom-end">
              <Popover.Trigger asChild>
                <Button size="$1" icon={Info} />
              </Popover.Trigger>
              <Popover.Content
                backgroundColor="$background"
                padding="$4"
                borderRadius="$3"
                elevation="$4"
                width={300}
              >
                <SizableText size="$2" color="$color10">
                  By making a payment, you are supporting the publication and
                  its editors. Your payment will be distributed equally among
                  all editors, helping to fund their work and ensure the ongoing
                  success of the publication.
                </SizableText>
                <SizableText size="$2">Thank you for your support!</SizableText>
              </Popover.Content>
            </Popover>
          </XStack>
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
        </YStack>
      </YGroup.Item>

      <YGroup.Item>
        <Button theme="green" onPress={handlePayment}>
          Tip
        </Button>
      </YGroup.Item>
    </YGroup>
  )
}

function RadioGroupItemWithLabel({
  value,
  size = '$2',
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
