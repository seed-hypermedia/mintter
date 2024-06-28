import { useAppContext } from '@/app-context'
import { SeedIcon } from '@/components/seed-icon'
import appError from '@/errors'
import { useSetProfile_deprecated } from '@/models/accounts'
import { useConnectPeer } from '@/models/contacts'
import { useAccountRegistration, useMnemonics } from '@/models/daemon'
import { useWalletOptIn } from '@/models/wallet'
import { trpc } from '@/trpc'
import { isHttpUrl } from '@/utils/navigation'
import { Profile as ProfileType } from '@shm/shared'
import {
  Button,
  ButtonProps,
  CheckboxField,
  ChevronDown,
  Copy,
  ErrorIcon,
  Fieldset,
  H1,
  H2,
  Input,
  Label,
  Next,
  ParagraphProps,
  Prev,
  Reload,
  Select,
  Separator,
  SizableText,
  Spinner,
  StepWrapper as StyledStepWrapper,
  Tabs,
  TextArea,
  Tooltip,
  XStack,
  YStack,
  toast,
  useTheme,
} from '@shm/ui'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {
  PropsWithChildren,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'

const CONTENT_MAX_WIDTH = 500

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  return (
    <OnboardingProvider onComplete={onComplete}>
      <OnboardingSteps />
    </OnboardingProvider>
  )
}

export function OnboardingSteps() {
  let ctx = useOnboarding()
  const key = ctx.state.key
  return (
    <>
      {key == 'welcome' && <Welcome key={key} {...ctx} />}
      {key == 'add new device' && <NewDevice key={key} {...ctx} />}
      {key == 'create new account' && <Mnemonics key={key} {...ctx} />}
      {key == 'profile' && <Profile key={key} {...ctx} />}
      {key == 'analytics' && <Analytics key={key} {...ctx} />}
      {key == 'wallet' && <Wallet key={key} {...ctx} />}
      {key == 'connect site' && <ConnectSite key={key} {...ctx} />}
    </>
  )
}

type OnboardingStepProps = OBContext

function Welcome(props: OnboardingStepProps) {
  return (
    <StepWrapper>
      <XStack flex={1} gap="$10">
        <StepTitleSection step="welcome">
          <H2>Welcome to</H2>
          <H1>Seed</H1>
        </StepTitleSection>

        <YStack flex={2} gap="$5">
          <StepParagraph>
            Welcome to Seed, the decentralized knowledge collaboration app that
            fosters constructive dialogue and critical debate.
          </StepParagraph>
          <StepParagraph>
            Join us today to create and join communities, share knowledge, and
            connect with experts and peers around the world.
          </StepParagraph>
          <YStack flex={1} />
          <YStack alignItems="flex-start" justifyContent="center" space="$2">
            <Button
              size="$5"
              onPress={() => props.send('NEW_ACCOUNT')}
              id="btn-new-account"
            >
              Create a new Account
            </Button>
            <Button
              id="btn-new-device"
              size="$3"
              bg="transparent"
              flex={1}
              onPress={() => props.send('NEW_DEVICE')}
            >
              or add a new device to your current account
            </Button>
          </YStack>
        </YStack>
      </XStack>
    </StepWrapper>
  )
}

function Mnemonics(props: OnboardingStepProps) {
  const [ownSeed, setOwnSeed] = useState<string>('')
  const [useOwnSeed, setUseOwnSeed] = useState<boolean>(false)
  const [error, setError] = useState('')
  const mnemonics = useMnemonics()
  const { ipc } = useAppContext()
  const [check1, setCheck1] = useState(false)
  const [check2, setCheck2] = useState(false)
  const [check3, setCheck3] = useState(false)

  const register = useAccountRegistration({
    onError: () => {
      setError('Failed to register your words.')
      appError('Failed to register your words.')
    },
    onSuccess: () => props.send('NEXT'),
  })

  const handleSubmit = useCallback(() => {
    setError('')
    let words: Array<string> = mnemonics.data || []
    if (useOwnSeed) {
      if (!ownSeed) {
        setError(`must provide mnemonics (current: ${ownSeed})`)
      }

      let error = isInputValid(ownSeed)

      if (typeof error == 'string') {
        // this means is an error
        setError(`Invalid mnemonics: ${error}`)
        return
      } else {
        words = extractWords(ownSeed)
      }
    } else {
      // check if the mnemonics.data has content
      if (mnemonics.data) {
        words = mnemonics.data
      } else {
        setError(`No mnemonics returned from the API. please `)
        return
      }
    }

    if (!words) {
      setError('No mnemonics')
      return
    }

    register.mutate(words)

    function isInputValid(input: string): string | boolean {
      let res = extractWords(input)
      if (!res.length) {
        return `Can't extract words from input. malformed input => ${input}`
      }
      if (res.length == 12) {
        return false
      } else {
        return `input does not have a valid words amount, please add a 12 mnemonics word. current input is ${res.length}`
      }
    }

    function extractWords(input: string): Array<string> {
      const delimiters = [',', ' ', '.', ';', ':', '\n', '\t']
      let wordSplitting = [input]
      delimiters.forEach((delimiter) => {
        wordSplitting = wordSplitting.flatMap((word) => word.split(delimiter))
      })
      let words = wordSplitting.filter((word) => word.length > 0)
      return words
    }
  }, [mnemonics.data, ownSeed, useOwnSeed, register])

  function onCopy() {
    if (mnemonics.data) {
      copyTextToClipboard(mnemonics.data.join(' '))
      toast.success('Words copied to your clipboard!')
    } else {
      appError(
        `Mnemonics: No mnemonics to copy: ${JSON.stringify(mnemonics.data)}`,
      )
    }
  }

  return (
    <StepWrapper>
      <XStack flex={1} gap="$10">
        <StepTitleSection step="mnemonics">
          <H2>Your Keys.</H2>
          <H1>Your Data.</H1>
        </StepTitleSection>
        <YStack flex={2}>
          <YStack gap="$5" maxWidth={500}>
            <Tabs
              defaultValue="generated"
              orientation="horizontal"
              flexDirection="column"
              onValueChange={(newVal: string) => {
                if (newVal == 'ownwords') {
                  setUseOwnSeed(true)
                } else {
                  setUseOwnSeed(false)
                }
              }}
            >
              <Tabs.List>
                <Tabs.Tab
                  value="generated"
                  flex={1}
                  id="btn-tab-generated"
                  bg={useOwnSeed ? '$background' : '$backgroundFocus'}
                >
                  <SizableText>Generate new words</SizableText>
                </Tabs.Tab>
                <Tabs.Tab
                  value="ownwords"
                  flex={1}
                  id="btn-tab-ownwords"
                  bg={useOwnSeed ? '$backgroundFocus' : '$background'}
                >
                  <SizableText>Use my own words</SizableText>
                </Tabs.Tab>
              </Tabs.List>
              <Tabs.Content value="generated" paddingVertical="$4">
                <YStack gap="$4">
                  <StepParagraph>
                    Please save these words securely! This will allow you to
                    recreate your account and recover associated funds:
                  </StepParagraph>

                  <XStack
                    padding="$2"
                    space
                    backgroundColor="$background"
                    borderRadius="$5"
                    elevation="$3"
                    minHeight={130}
                    borderColor="$backgroundHover"
                    borderWidth="$0.5"
                    alignItems="flex-start"
                  >
                    <SizableText
                      padding="$2"
                      fontFamily="$mono"
                      fontSize={18}
                      fontWeight="700"
                      display="block"
                      id="recovery-phrase-words"
                    >
                      {mnemonics.data?.join(' ')}
                    </SizableText>
                    <XStack>
                      <Tooltip content="regenerate words">
                        <Button
                          id="btn-reload-mnemonics"
                          flex={0}
                          flexShrink={0}
                          icon={Reload}
                          onPress={() => mnemonics.refetch()}
                          size="$2"
                        />
                      </Tooltip>
                      <Tooltip content="Copy words to clipboard">
                        <Button
                          id="btn-copy-mnemonics"
                          flex={0}
                          flexShrink={0}
                          icon={Copy}
                          onPress={onCopy}
                          size="$2"
                        />
                      </Tooltip>
                    </XStack>
                  </XStack>
                  <CheckboxField
                    value={check1}
                    id="check1"
                    onValue={(v) => setCheck1(!!v)}
                    labelProps={{
                      unstyled: true,
                      fontWeight: 'bold',
                      color: '$color12',
                    }}
                  >
                    I have stored my 12-word recovery phrase in a safe place.
                  </CheckboxField>
                  <CheckboxField
                    id="check2"
                    value={check2}
                    onValue={(v) => setCheck2(!!v)}
                    labelProps={{
                      unstyled: true,
                      fontWeight: 'bold',
                      color: '$red11',
                    }}
                  >
                    I understand that after this point I will not be able to
                    recover my 12-word recovery phrase. Seed cannot help me
                    recover them if I lose it.
                  </CheckboxField>
                </YStack>
              </Tabs.Content>
              <Tabs.Content value="ownwords" paddingVertical="$4">
                <YStack gap="$4">
                  <StepParagraph>
                    If you aready have a BIP-39 seed, you can reuse it with Seed
                    and we will derive a seprate Seed-specific key from it
                  </StepParagraph>
                  <XStack
                    backgroundColor="$backgroundHover"
                    borderRadius="$5"
                    elevation="$3"
                  >
                    <TextArea
                      autoFocus
                      fontSize={18}
                      flex={1}
                      id="ownwords-input"
                      placeholder={
                        'Add your 12 mnemonics words \n(food barrel buzz, ...)'
                      }
                      minHeight={130}
                      onChangeText={setOwnSeed}
                      fontFamily="$mono"
                      fontWeight="500"
                      borderColor="$backgroundHover"
                      borderWidth="$0.5"
                    />
                  </XStack>
                  <CheckboxField
                    id="check3"
                    value={check3}
                    onValue={(v) => setCheck3(!!v)}
                    labelProps={{
                      unstyled: true,
                      fontWeight: 'bold',
                      color: '$red11',
                    }}
                  >
                    I understand that after this point I will not be able to
                    recover my 12-word recovery phrase. Seed cannot help me
                    recover them if I lose it.
                  </CheckboxField>

                  {error || register.status == 'error' ? (
                    <XStack
                      alignItems="center"
                      gap="$2"
                      backgroundColor="$red10"
                      borderRadius="$1"
                      paddingHorizontal="$4"
                      paddingVertical={0}
                      id="mnemonics-error-box"
                    >
                      <ErrorIcon size={12} color="$red1" />
                      <SizableText size="$1" fontWeight="600" color="$red1">
                        {error}
                      </SizableText>
                    </XStack>
                  ) : null}
                </YStack>
              </Tabs.Content>
            </Tabs>

            {mnemonics.isError ? (
              <XStack
                padding="$4"
                theme="yellow"
                backgroundColor="$background"
                borderRadius="$5"
                elevation="$1"
                borderColor="$backgroundHover"
                borderWidth="$0.5"
              >
                <SizableText
                  fontFamily="$mono"
                  fontSize={14}
                  fontWeight="700"
                  display="block"
                  color="$color"
                >
                  {JSON.stringify(mnemonics.error, null)}
                </SizableText>
              </XStack>
            ) : null}
          </YStack>
        </YStack>
      </XStack>
      <XStack alignItems="center" justifyContent="flex-end" gap="$4">
        <PrevButton onPress={() => props.send('PREV')}>PREV</PrevButton>
        {useOwnSeed ? (
          <NextButton
            onPress={handleSubmit}
            disabled={!check3}
            opacity={check3 ? 1 : 0.1}
          >
            NEXT
          </NextButton>
        ) : (
          <NextButton
            onPress={handleSubmit}
            disabled={!check1 && !check2}
            opacity={check1 && check2 ? 1 : 0.1}
          >
            NEXT
          </NextButton>
        )}
      </XStack>
    </StepWrapper>
  )
}

function NewDevice(props: OnboardingStepProps) {
  const [ownSeed, setOwnSeed] = useState<string>('')
  const [error, setError] = useState('')
  const [check1, setCheck1] = useState(false)

  const register = useAccountRegistration({
    onError: () => {
      setError('Failed to register your words.')
      appError('Failed to register your words.')
    },
    onSuccess: () => props.send('NEXT'),
  })

  const handleSubmit = useCallback(() => {
    setError('')
    let words: Array<string> = []
    if (!ownSeed) {
      setError(`must provide mnemonics (current: ${ownSeed})`)
    }

    let error = isInputValid(ownSeed)

    if (typeof error == 'string') {
      // this means is an error
      setError(`Invalid mnemonics: ${error}`)
      return
    } else {
      words = extractWords(ownSeed)
    }

    if (!words) {
      setError('No mnemonics')
      return
    }

    register.mutate(words)

    function isInputValid(input: string): string | boolean {
      let res = extractWords(input)

      if (!res.length) {
        return `Can't extract words from input. malformed input => ${input}`
      }
      if (res.length == 12) {
        return false
      } else {
        return `input does not have a valid words amount, please add a 12 mnemonics word. current input is ${res.length}`
      }
    }

    function extractWords(input: string): Array<string> {
      const delimiters = [',', ' ', '.', ';', ':', '\n', '\t']
      let wordSplitting = [input]
      delimiters.forEach((delimiter) => {
        wordSplitting = wordSplitting.flatMap((word) => word.split(delimiter))
      })
      let words = wordSplitting.filter((word) => word.length > 0)
      return words
    }
  }, [ownSeed, register])

  return (
    <StepWrapper>
      <XStack flex={1} gap="$10">
        <StepTitleSection step="new-device">
          <H2>Setup</H2>
          <H1>New device.</H1>
        </StepTitleSection>
        <YStack flex={2}>
          <YStack gap="$5" maxWidth={500}>
            <StepParagraph>
              Add your account&apos;s Secret Recovery phrase in the input below
              separated by commas.
            </StepParagraph>
            <YStack gap="$4" justifyContent="flex-start">
              <XStack
                backgroundColor="$backgroundHover"
                borderRadius="$5"
                elevation="$3"
              >
                <TextArea
                  autoFocus
                  fontSize={18}
                  flex={1}
                  id="new-device-input"
                  placeholder={
                    'Add your 12 mnemonics words \n(food, barrel, buzz, ...)'
                  }
                  minHeight={130}
                  onChangeText={setOwnSeed}
                  fontFamily="$mono"
                  fontWeight="500"
                  borderColor="$backgroundHover"
                  borderWidth="$0.5"
                />
              </XStack>
              <CheckboxField
                id="check1"
                value={check1}
                onValue={(v) => setCheck1(!!v)}
                labelProps={{
                  unstyled: true,
                  fontWeight: 'bold',
                  color: '$red11',
                }}
              >
                I understand that after this point I will not be able to recover
                my 12-word recovery phrase. Seed cannot help me recover them if
                I lose it.
              </CheckboxField>
              {error || register.status == 'error' ? (
                <XStack
                  alignItems="center"
                  gap="$2"
                  backgroundColor="$red10"
                  borderRadius="$1"
                  paddingHorizontal="$4"
                  paddingVertical={0}
                  id="mnemonics-error-box"
                >
                  <ErrorIcon size={12} color="$red1" />
                  <SizableText size="$1" fontWeight="600" color="$red1">
                    {error}
                  </SizableText>
                </XStack>
              ) : null}
            </YStack>
          </YStack>
        </YStack>
      </XStack>
      <XStack alignItems="center" justifyContent="flex-end" gap="$4">
        <PrevButton onPress={() => props.send('PREV')}>PREV</PrevButton>
        <NextButton
          onPress={handleSubmit}
          disabled={!check1}
          opacity={check1 ? 1 : 0.1}
        >
          NEXT
        </NextButton>
      </XStack>
    </StepWrapper>
  )
}

function Profile(props: OnboardingStepProps) {
  const setProfile = useSetProfile_deprecated({
    onError: (e) => appError('Failed to set your profile', e),
    onSuccess: () => props.send('NEXT'),
  })

  const submitValue = useRef({ alias: '' } as ProfileType)
  function onSubmit() {
    if (submitValue.current.alias == '') {
      props.send('NEXT')
    } else {
      setProfile.mutate(submitValue.current)
    }
  }

  return (
    <StepWrapper>
      <XStack flex={1} gap="$10">
        <StepTitleSection step="profile">
          <H2>Profile</H2>
          <H1>Information</H1>
        </StepTitleSection>

        <YStack flex={2}>
          <YStack gap="$5" maxWidth={500}>
            <StepParagraph>
              Link your personal data with your new Seed account. You can fill
              this information later if you prefer.
            </StepParagraph>
            <XStack maxWidth={CONTENT_MAX_WIDTH}>
              <YStack flex={1}>
                <Fieldset
                  paddingHorizontal={0}
                  margin={0}
                  borderColor="transparent"
                  borderWidth={0}
                >
                  <Label size="$2" htmlFor="alias" role="complementary">
                    Alias
                  </Label>
                  <Input
                    id="alias"
                    onChangeText={(val) => (submitValue.current.alias = val)}
                    placeholder="Readable alias or username. Doesn't have to be unique."
                  />
                </Fieldset>
              </YStack>
            </XStack>
          </YStack>
        </YStack>
      </XStack>
      <XStack alignItems="center" justifyContent="flex-end" gap="$4">
        <NextButton onPress={onSubmit}>NEXT</NextButton>
      </XStack>
    </StepWrapper>
  )
}

function Analytics(props: OnboardingStepProps) {
  return (
    <StepWrapper>
      <XStack flex={1} gap="$10">
        <StepTitleSection step="analytics">
          <H2>Crash</H2>
          <H1>Analytics</H1>
        </StepTitleSection>

        <YStack flex={2}>
          <YStack gap="$5" maxWidth={500}>
            <StepParagraph>
              Pre-release versions of Seed automatically send anonymized crash
              reports when things go wrong. This helps us fix bugs and improve
              performance.
            </StepParagraph>
            <StepParagraph>
              We strongly believe privacy is a basic human right, so the full
              release of Seed will never send your data to anyone.
            </StepParagraph>
          </YStack>
        </YStack>
      </XStack>
      <XStack alignItems="center" justifyContent="flex-end" gap="$4">
        <PrevButton onPress={() => props.send('PREV')}>PREV</PrevButton>
        <NextButton onPress={() => props.send('NEXT')}>NEXT</NextButton>
      </XStack>
    </StepWrapper>
  )
}

function Wallet(props: OnboardingStepProps) {
  const { optIn, wallets } = useWalletOptIn({
    onError: (e) => {
      toast.error(e.message)
    },
  })
  return (
    <StepWrapper>
      <XStack flex={1} gap="$10">
        <StepTitleSection step="wallet">
          <H2>Sponsorship</H2>
          <H1>Wallet</H1>
        </StepTitleSection>
        <YStack flex={2}>
          {wallets.data?.length && wallets.data?.length > 0 ? (
            <StepParagraph id="wallet-success-mssg">
              Your wallet is ready to use!
            </StepParagraph>
          ) : wallets.data?.length === 0 ? (
            <YStack gap="$5" maxWidth={500}>
              <StepParagraph>
                Opt in to receiving lightning payments
              </StepParagraph>
              <XStack>
                <Button
                  id="btn-accept-wallet"
                  onPress={() => {
                    optIn.mutate()
                  }}
                >
                  Accept Lightning Payments
                </Button>
              </XStack>
            </YStack>
          ) : null}
        </YStack>
      </XStack>
      <XStack alignItems="center" justifyContent="flex-end" gap="$4">
        {optIn.isLoading || optIn.isLoading ? <Spinner /> : null}
        <PrevButton onPress={() => props.send('PREV')}>PREV</PrevButton>
        <NextButton onPress={() => props.send('NEXT')}>NEXT</NextButton>
      </XStack>
    </StepWrapper>
  )
}

const SuggestedSites = import.meta.env.DEV
  ? ['test.hyper.media']
  : ['seedhypermedia.com', 'hyper.media', 'mintter.com']

function ConnectSite(props: OnboardingStepProps) {
  const connectPeer = useConnectPeer({
    syncImmediately: true,
    aggressiveInvalidation: true,
    onSuccess: () => {
      props.complete()
    },
    onError: (error, peer) => {
      appError(`Failed to connect to ${peer}`, { error })
    },
  })
  const [siteDomain, setSiteDomain] = useState(SuggestedSites[0])
  const [customSite, setCustomSite] = useState(false)
  const customDomainInput = useRef(null)
  useEffect(() => {
    if (customSite) {
      customDomainInput.current?.focus()
    }
  }, [customSite])
  return (
    <StepWrapper>
      <XStack flex={1} gap="$10">
        <StepTitleSection step="site">
          <H2>Connect</H2>
          <H1>First Site</H1>
        </StepTitleSection>

        <YStack flex={2}>
          <YStack gap="$5" width={440}>
            <StepParagraph width={360}>
              Choose the domain to sync your first content from. You will
              connect to more sites later as you discover them.
            </StepParagraph>

            {customSite ? (
              <Input
                ref={customDomainInput}
                value={siteDomain}
                onChangeText={setSiteDomain}
                placeholder={SuggestedSites[0]}
              />
            ) : (
              <Select
                value={siteDomain}
                onValueChange={(value) => {
                  if (value === 'custom domain') {
                    setSiteDomain('')
                    setCustomSite(true)
                  } else {
                    setSiteDomain(value)
                  }
                }}
              >
                <Select.Trigger iconAfter={ChevronDown}>
                  <Select.Value placeholder="..." />
                </Select.Trigger>
                <Select.Content>
                  <Select.Viewport>
                    {SuggestedSites.map((suggestedDomain, index) => (
                      <Select.Item
                        key={suggestedDomain}
                        index={index}
                        value={suggestedDomain}
                      >
                        <Select.ItemText>{suggestedDomain}</Select.ItemText>
                      </Select.Item>
                    ))}
                    <Separator />
                    <Select.Item
                      index={SuggestedSites.length}
                      value="custom domain"
                    >
                      <Select.ItemText>Custom Domain...</Select.ItemText>
                    </Select.Item>
                  </Select.Viewport>
                  <Select.ScrollDownButton />
                </Select.Content>
              </Select>
            )}
            <StepParagraph>
              Or you can skip this step, create content locally, and share with
              peers you connect to.
            </StepParagraph>
          </YStack>
        </YStack>
      </XStack>
      <XStack alignItems="center" justifyContent="flex-end" gap="$4">
        {connectPeer.isLoading ? <Spinner /> : null}
        <Button id="btn-skip" onPress={() => props.complete()} size="$4">
          Skip
        </Button>
        <NextButton
          size="$4"
          onPress={() => {
            const domainToUse =
              siteDomain === '' ? SuggestedSites[0] : siteDomain
            const fullDomain = isHttpUrl(domainToUse)
              ? siteDomain
              : `https://${siteDomain}`
            connectPeer.mutate(fullDomain)
          }}
        >
          Connect Site
        </NextButton>
      </XStack>
    </StepWrapper>
  )
}

function StepWrapper({ children, ...props }: PropsWithChildren<unknown>) {
  const theme = useTheme()
  return (
    <StyledStepWrapper
      fullscreen
      x={0}
      opacity={1}
      animation={[
        'medium',
        {
          opacity: {
            overshootClamping: true,
          },
        },
      ]}
      {...props}
    >
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        className="window-drag"
      >
        <YStack
          className="no-window-drag"
          borderRadius="$7"
          elevation="$12"
          backgroundColor="$background1"
          minWidth={678}
          minHeight={500}
          maxWidth={1024}
        >
          <YStack alignItems="flex-start" padding="$6">
            <SeedIcon
              size="$3"
              color={theme.color8?.val || 'hsl(0, 0%, 81.0%)'}
            />
          </YStack>

          <YStack flex={1} padding="$6" gap="$5">
            {children}
          </YStack>
        </YStack>
      </YStack>
    </StyledStepWrapper>
  )
}

function StepParagraph({ children, ...props }: ParagraphProps) {
  return (
    <SizableText size="$5" maxWidth={CONTENT_MAX_WIDTH}>
      {children}
    </SizableText>
  )
}

function NextButton(props: ButtonProps) {
  return <Button id="btn-next" iconAfter={Next} size="$4" {...props} />
}

function PrevButton(props: ButtonProps) {
  return (
    <Button
      id="btn-prev"
      chromeless
      icon={Prev}
      size="$2"
      opacity={0.5}
      {...props}
    />
  )
}

function StepTitleSection({
  children,
  step,
}: {
  children: ReactNode
  step: string
}) {
  return (
    <YStack id={`${step}-title-section`} flex={0} flexShrink={0} width={240}>
      {children}
    </YStack>
  )
}

let machine = {
  id: 'Onboarding',
  initial: 'welcome',
  states: {
    welcome: {
      on: {
        NEW_DEVICE: {
          target: 'add new device',
        },
        NEW_ACCOUNT: {
          target: 'create new account',
        },
      },
    },
    'add new device': {
      on: {
        PREV: {
          target: 'welcome',
        },
        NEXT: {
          target: 'connect site',
        },
      },
    },
    'create new account': {
      on: {
        PREV: {
          target: 'welcome',
        },
        NEXT: {
          target: 'profile',
        },
      },
    },
    profile: {
      on: {
        PREV: {
          target: 'create new account',
        },
        NEXT: {
          target: 'wallet',
        },
      },
    },
    wallet: {
      on: {
        PREV: {
          target: 'profile',
        },
        NEXT: {
          target: 'analytics',
        },
      },
    },
    analytics: {
      on: {
        PREV: {
          target: 'wallet',
        },
        NEXT: {
          target: 'connect site',
        },
      },
    },
    'connect site': {
      final: true,
    },
  },
}

function transition(state: OBState, event: OBAction): OBState {
  const nextState: { target: keyof typeof machine.states } | {} =
    // @ts-expect-error
    machine.states[state.key].on?.[event]?.target || state

  return {
    // @ts-expect-error
    key: nextState,
    direction: event == 'PREV' ? -1 : 1,
  }
}

type OBState = {
  key: keyof typeof machine.states
  direction: 1 | -1
}

type OBAction = 'NEXT' | 'PREV' | 'NEW_DEVICE' | 'NEW_ACCOUNT'

type OBContext = {
  state: OBState
  send: (action: OBAction) => void
  complete: () => void
}

let OnboardingContext = createContext<null | OBContext>(null)

export function OnboardingProvider({
  children,
  initialStep = {
    key: 'welcome',
    direction: 1,
  },
  onComplete,
}: {
  children: ReactNode
  initialStep?: OBState
  onComplete: () => void
}) {
  let [state, send] = useReducer(transition, initialStep)
  const writeIsProbablyNewAccount =
    trpc.welcoming.writeIsProbablyNewAccount.useMutation()
  let value = useMemo(
    () => ({
      state,
      complete: onComplete,
      send: (action: OBAction) => {
        if (action === 'NEW_ACCOUNT') {
          writeIsProbablyNewAccount.mutate(true)
        } else if (action === 'NEW_DEVICE') {
          writeIsProbablyNewAccount.mutate(false)
        }
        send(action)
      },
    }),
    [state, writeIsProbablyNewAccount],
  )

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ob = useContext(OnboardingContext)
  if (!ob)
    throw new Error('useOnboarding must be used within a OnboardingProvider')
  return ob
}
