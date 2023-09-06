import {MintterIcon} from '@mintter/app/src/components/mintter-icon'
import appError from '@mintter/app/src/errors'
import {useSetProfile} from '@mintter/app/src/models/accounts'
import {
  useAccountRegistration,
  useMnemonics,
} from '@mintter/app/src/models/daemon'
import {Profile as ProfileType} from '@mintter/shared'
import {
  AnimatePresence,
  Button,
  Copy,
  ErrorIcon,
  Fieldset,
  H1,
  H2,
  Input,
  Label,
  Next,
  Paragraph,
  ParagraphProps,
  Prev,
  Reload,
  SizableText,
  StepWrapper as StyledStepWrapper,
  TextArea,
  Tooltip,
  XStack,
  YStack,
  useTheme,
} from '@mintter/ui'
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
import toast from 'react-hot-toast'

const CONTENT_MAX_WIDTH = 500

export function Onboarding() {
  return (
    <OnboardingProvider>
      <OnboardingSteps />
    </OnboardingProvider>
  )
}

export function OnboardingSteps() {
  let obValue = useOnboarding()
  let direction = obValue.state.direction
  const enterVariant = direction == 1 || direction == 0 ? 'isRight' : 'isLeft'
  const exitVariant = direction === 1 ? 'isLeft' : 'isRight'
  return (
    <AnimatePresence enterVariant={enterVariant} exitVariant={exitVariant}>
      {obValue.state.key == 'welcome' && (
        <Welcome key={obValue.state.key} {...obValue} />
      )}
      {obValue.state.key == 'mnemonics' && (
        <Mnemonics key={obValue.state.key} {...obValue} />
      )}
      {obValue.state.key == 'profile' && (
        <Profile key={obValue.state.key} {...obValue} />
      )}
      {obValue.state.key == 'analytics' && (
        <Analytics key={obValue.state.key} {...obValue} />
      )}
      {obValue.state.key == 'complete' && <Complete key={obValue.state.key} />}
    </AnimatePresence>
  )
}

type OnboardingStepProps = OBContext

function Welcome(props: OnboardingStepProps) {
  return (
    <StepWrapper>
      <XStack flex={1} gap="$10">
        <StepTitleSection>
          <H2>Welcome to</H2>
          <H1>Mintter</H1>
        </StepTitleSection>

        <YStack flex={2} gap="$5">
          <StepParagraph>
            Welcome to Mintter, the decentralized knowledge collaboration app
            that fosters constructive dialogue and critical debate.
          </StepParagraph>
          <StepParagraph>
            Join us today to create and join communities, share knowledge, and
            connect with experts and peers around the world.
          </StepParagraph>
        </YStack>
      </XStack>

      <XStack alignItems="center" justifyContent="flex-start">
        <Button
          iconAfter={Next}
          size="$4"
          onPress={() => props.dispatch({type: 'next'})}
        >
          NEXT
        </Button>
      </XStack>
    </StepWrapper>
  )
}

function Mnemonics(props: OnboardingStepProps) {
  const [ownSeed, setOwnSeed] = useState<string>('')
  const [useOwnSeed, setUseOwnSeed] = useState<boolean>(false)
  const [error, setError] = useState('')
  const mnemonics = useMnemonics()

  const register = useAccountRegistration({
    onError: () => {
      setError('Failed to register your words.')
      appError('Failed to register your words.')
    },
    onSuccess: () => props.dispatch({type: 'next'}),
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

      console.log(`== ~ extractWords ~ res:`, res)

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
      copyTextToClipboard(mnemonics.data.join(','))
      toast.success('Words copied to your clipboard!')
    } else {
      console.error(
        `Mnemonics: No mnemonics to copy: ${JSON.stringify(mnemonics.data)}`,
      )
    }
  }

  return (
    <StepWrapper>
      <XStack flex={1} gap="$10">
        <StepTitleSection>
          <H2>Your Keys.</H2>
          <H1>Your Data.</H1>
        </StepTitleSection>
        <YStack flex={2}>
          <YStack gap="$5" maxWidth={500}>
            <StepParagraph>
              Please save these words securely! This will allow you to recreate
              your account and recover associated funds:
            </StepParagraph>
            {useOwnSeed ? (
              <YStack gap="$2">
                <XStack
                  backgroundColor="$backgroundHover"
                  borderRadius="$5"
                  elevation="$3"
                >
                  <TextArea
                    fontSize={18}
                    flex={1}
                    id="mnemonic-input"
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
                {error || register.status == 'error' ? (
                  <XStack
                    alignItems="center"
                    gap="$2"
                    backgroundColor="$red10"
                    borderRadius="$1"
                    paddingHorizontal="$4"
                    paddingVertical={0}
                  >
                    <ErrorIcon size={12} color="$red1" />
                    <SizableText size="$1" fontWeight="600" color="$red1">
                      {error}
                    </SizableText>
                  </XStack>
                ) : null}
              </YStack>
            ) : mnemonics.isError ? (
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
            ) : (
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
                  testID="mnemonics"
                >
                  {mnemonics.data?.join(', ')}
                </SizableText>
                <XStack>
                  <Tooltip content="regenerate words">
                    <Button
                      flex={0}
                      flexShrink={0}
                      icon={Reload}
                      onPress={() => mnemonics.refetch()}
                      size="$2"
                    />
                  </Tooltip>
                  <Tooltip content="Copy words to clipboard">
                    <Button
                      flex={0}
                      flexShrink={0}
                      icon={Copy}
                      onPress={onCopy}
                      size="$2"
                    />
                  </Tooltip>
                </XStack>
              </XStack>
            )}
            <XStack>
              <Button
                size="$2"
                theme="green"
                testID="ownseed-btn"
                onPress={() => {
                  setOwnSeed('')
                  if (useOwnSeed) {
                    // refetch here is so that user always sees new words when they click "generate a new seed"
                    // so they feel like they're getting a secure fresh seed
                    mnemonics.refetch()
                    setUseOwnSeed(false)
                  } else {
                    setUseOwnSeed(true)
                  }
                }}
              >
                {useOwnSeed ? 'Generate a new seed' : 'Provide your own seed'}
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </XStack>
      <XStack alignItems="center" justifyContent="flex-start" gap="$4">
        <Button
          chromeless
          icon={Prev}
          size="$2"
          opacity={0.5}
          onPress={() => props.dispatch({type: 'prev'})}
        >
          PREV
        </Button>
        <Button
          iconAfter={Next}
          size="$4"
          onPress={handleSubmit}
          disabled={register.isLoading}
        >
          NEXT
        </Button>
      </XStack>
    </StepWrapper>
  )
}

function Profile(props: OnboardingStepProps) {
  const setProfile = useSetProfile({
    onError: (e) => appError('Failed to set your profile', e),
    onSuccess: () => props.dispatch({type: 'next'}),
  })

  const submitValue = useRef({alias: '', bio: ''} as ProfileType)
  function onSubmit() {
    setProfile.mutate(submitValue.current)
  }

  return (
    <StepWrapper>
      <XStack flex={1} gap="$10">
        <StepTitleSection>
          <H2>Profile</H2>
          <H1>Information</H1>
        </StepTitleSection>

        <YStack flex={2}>
          <YStack gap="$5" maxWidth={500}>
            <StepParagraph>
              Link your personal data with your new Mintter account. You can
              fill this information later if you prefer.
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
                    testID="input-alias"
                    onChangeText={(val) => (submitValue.current.alias = val)}
                    placeholder="Readable alias or username. Doesn't have to be unique."
                  />
                </Fieldset>
                <Fieldset
                  paddingHorizontal={0}
                  margin={0}
                  borderColor="transparent"
                  borderWidth={0}
                >
                  <Label size="$2" htmlFor="bio" role="complementary">
                    Bio
                  </Label>
                  <TextArea
                    id="bio"
                    multiline
                    minHeight={100}
                    numberOfLines={4}
                    onChangeText={(val: string) =>
                      (submitValue.current.bio = val)
                    }
                    placeholder="A little bit about yourself..."
                  />
                </Fieldset>
              </YStack>
            </XStack>
          </YStack>
        </YStack>
      </XStack>
      <XStack alignItems="center" justifyContent="flex-start" gap="$4">
        <Button
          chromeless
          icon={Prev}
          size="$2"
          opacity={0.5}
          onPress={() => props.dispatch({type: 'prev'})}
        >
          PREV
        </Button>
        <Button
          iconAfter={Next}
          size="$4"
          onPress={onSubmit}
          disabled={setProfile.isLoading}
        >
          NEXT
        </Button>
      </XStack>
    </StepWrapper>
  )
}

function Analytics(props: OnboardingStepProps) {
  return (
    <StepWrapper>
      <XStack flex={1} gap="$10">
        <StepTitleSection>
          <H2>Crash</H2>
          <H1>Analytics</H1>
        </StepTitleSection>

        <YStack flex={2}>
          <YStack gap="$5" maxWidth={500}>
            <StepParagraph>
              Pre-release versions of Mintter automatically send anonymized
              crash reports when things go wrong. This helps us fix bugs and
              improve performance.
            </StepParagraph>
            <StepParagraph>
              We strongly believe privacy is a basic human right, so the full
              release of Mintter will never send your data to anyone.
            </StepParagraph>
          </YStack>
        </YStack>
      </XStack>
      <XStack alignItems="center" justifyContent="flex-start" gap="$4">
        <Button
          chromeless
          icon={Prev}
          size="$2"
          opacity={0.5}
          onPress={() => props.dispatch({type: 'prev'})}
        >
          PREV
        </Button>
        <Button
          iconAfter={Next}
          size="$4"
          onPress={() => props.dispatch({type: 'next'})}
        >
          NEXT
        </Button>
      </XStack>
    </StepWrapper>
  )
}

function Complete() {
  return (
    <StepWrapper>
      <XStack flex={1} gap="$10">
        <StepTitleSection>
          <H1>You are Ready!</H1>
        </StepTitleSection>

        <YStack flex={2}>
          <YStack gap="$5" width={440}>
            <StepParagraph width={360}>
              You just created your Mintter account. Please share it with others
              and help us spread the word.
            </StepParagraph>
          </YStack>
        </YStack>
      </XStack>
      <XStack alignItems="center" justifyContent="flex-start" gap="$4">
        <Button
          iconAfter={Next}
          size="$4"
          theme="green"
          onPress={() => window.location.reload()}
        >
          Open Mintter App
        </Button>
      </XStack>
    </StepWrapper>
  )
}

function StepWrapper({children, ...props}: PropsWithChildren<unknown>) {
  const theme = useTheme()
  return (
    <StyledStepWrapper
      fullscreen
      x={0}
      opacity={1}
      animation={[
        'lazy',
        {
          opacity: {
            overshootClamping: true,
          },
        },
      ]}
    >
      <YStack flex={1} alignItems="center" justifyContent="center">
        <YStack
          borderRadius="$7"
          elevation="$12"
          backgroundColor="$background1"
          minWidth={678}
          minHeight={500}
          maxWidth={1024}
        >
          <YStack alignItems="flex-start" padding="$6">
            <MintterIcon
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

function CurrentStep() {
  let stepIndex = useOBStepIndex()
  return (
    <SizableText
      fontWeight="700"
      size="$1"
      opacity={0.7}
      position="absolute"
      top={-24}
    >
      step {stepIndex + 1} of {obSteps.length}
    </SizableText>
  )
}

function StepParagraph({children, ...props}: ParagraphProps) {
  return (
    <Paragraph size="$5" maxWidth={CONTENT_MAX_WIDTH}>
      {children}
    </Paragraph>
  )
}

function StepTitleSection({children}: {children: ReactNode}) {
  return (
    <YStack flex={0} flexShrink={0} width={240}>
      <CurrentStep />
      {children}
    </YStack>
  )
}

// ==== context

export let obSteps = [
  'welcome',
  'mnemonics',
  'profile',
  'analytics',
  'complete',
] as const

type OBState = {
  stepIndex: number
  key: (typeof obSteps)[number]
  direction: 0 | 1 | -1
}

type OBAction = {type: 'next'} | {type: 'prev'}

type OBContext = {
  state: OBState
  dispatch: (action: OBAction) => void
}

let OnboardingContext = createContext<null | OBContext>(null)

function obStateReducer(state: OBState, action: OBAction): OBState {
  let stepIndex = state.stepIndex
  let key = state.key
  switch (action.type) {
    case 'next':
      if (obSteps.length - 1 == stepIndex) return state
      stepIndex = state.stepIndex + 1
      key = obSteps[stepIndex]
      return {
        ...state,
        stepIndex,
        key,
        direction: 1,
      }
    case 'prev':
      if (state.stepIndex == 0) return state
      stepIndex = state.stepIndex - 1
      key = obSteps[stepIndex]
      return {
        ...state,
        stepIndex,
        key,
        direction: -1,
      }
    default:
      return state
  }
}

export function OnboardingProvider({
  children,
  initialStep = {
    stepIndex: 0,
    key: obSteps[0],
    direction: 0,
  },
}: {
  children: ReactNode
  initialStep?: OBState
}) {
  let [state, dispatch] = useReducer(obStateReducer, initialStep)
  let {key, stepIndex} = state

  useEffect(() => {
    console.log(`=== onboarding state:
			${JSON.stringify(state)}
		`)
  }, [state])

  let value = useMemo(
    () => ({
      state,
      dispatch,
    }),
    [state],
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

export function useOBKey() {
  const ob = useContext(OnboardingContext)
  if (!ob)
    throw new Error('useOBState must be used within a OnboardingProvider')
  return ob.state.key
}

export function useOBStepIndex() {
  const ob = useContext(OnboardingContext)
  if (!ob)
    throw new Error('useOBStepIndex must be used within a OnboardingProvider')
  return ob.state.stepIndex
}

export function useOBDirection() {
  const ob = useContext(OnboardingContext)
  if (!ob)
    throw new Error('useOBStepIndex must be used within a OnboardingProvider')
  return ob.state.direction
}

export function useOBDispatch() {
  const ob = useContext(OnboardingContext)
  if (!ob)
    throw new Error('useOBDispatch must be used within a OnboardingProvider')
  return ob.dispatch
}
