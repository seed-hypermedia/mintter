import appError from '@app/errors'
import {useMyAccount, useSetProfile} from '@app/models/accounts'
import {useAccountRegistration, useMnemonics} from '@app/models/daemon'
import {NotFoundPage} from '@app/pages/base'
import {AvatarForm} from '@components/avatar-form'
import {MintterIcon} from '@components/mintter-icon'
import {Tooltip} from '@components/tooltip'
import {Profile as ProfileType} from '@mintter/shared'
import {
  Button,
  Copy,
  Fieldset,
  H1,
  H3,
  Input,
  Label,
  Next,
  Paragraph,
  Prev,
  SizableText,
  Text,
  TextArea,
  XStack,
  YStack,
} from '@mintter/ui'
import {useMutation, useQuery} from '@tanstack/react-query'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import toast from 'react-hot-toast'

export function Onboarding() {
  return (
    <OnboardingProvider>
      <OnboardingSteps />
    </OnboardingProvider>
  )
}

export function OnboardingSteps() {
  let obValue = useOnboarding()
  let StepComponent = getComponent(obValue.state.key)
  return (
    <YStack
      fullscreen
      alignItems="center"
      justifyContent="center"
      // backgroundColor="$blue12"
    >
      <StepComponent {...obValue} />
    </YStack>
  )
}

function getComponent(step: OBState['key']) {
  switch (step) {
    case 'welcome':
      return Welcome
    case 'mnemonics':
      return Mnemonics
    case 'profile':
      return Profile
    case 'analytics':
      return Analytics
    case 'complete':
      return Complete
    default:
      return NotFoundPage
  }
}

type OnboardingStepProps = OBContext

function Welcome(props: OnboardingStepProps) {
  return (
    <StepWrapper>
      <XStack flex={1} gap="$10">
        <YStack flex={1} flexShrink={0}>
          <CurrentStep />
          <H1>Welcome to</H1>
          <H1>Mintter</H1>
        </YStack>

        <YStack flex={2} gap="$5">
          <Paragraph size="$6" maxWidth={500}>
            Welcome to Mintter, the decentralized knowledge collaboration app
            that fosters constructive dialogue and critical debate.
          </Paragraph>
          <Paragraph size="$6" maxWidth={500}>
            Join us today to create and join communities, share knowledge, and
            connect with experts and peers around the world.
          </Paragraph>
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
  const mnemonics = useMnemonics()

  const register = useAccountRegistration({
    onError: () => appError('Failed to register your words.'),
    onSuccess: () => props.dispatch({type: 'next'}),
  })

  const handleSubmit = useCallback(() => {
    const words =
      useOwnSeed && ownSeed
        ? ownSeed
            .split(' ')
            .map((s) => s.split(','))
            .flat(1)
        : mnemonics.data
    if (!words) throw new Error('No words to submit')
    register.mutate(words)
  }, [mnemonics.data, ownSeed, useOwnSeed])

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
        <YStack flex={1} flexShrink={0}>
          <CurrentStep />
          <H1>Your Keys.</H1>
          <H1>Your Data.</H1>
        </YStack>
        <YStack flex={2}>
          <YStack gap="$5" maxWidth={500}>
            <Paragraph size="$6">
              Please save these words securely! This will allow you to recreate
              your account and recover associated funds:
            </Paragraph>
            {useOwnSeed ? (
              <XStack
                backgroundColor="$backgroundHover"
                borderRadius="$5"
                elevation="$3"
              >
                <TextArea
                  fontSize={20}
                  tabIndex={-1}
                  flex={1}
                  placeholder="food barrel buzz ..."
                  minHeight={130}
                  onChangeText={setOwnSeed}
                  fontFamily="monospace"
                  fontWeight="700"
                  borderColor="$backgroundHover"
                  borderWidth="$0.5"
                />
              </XStack>
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
                  fontFamily="monospace"
                  fontSize={16}
                  fontWeight="700"
                  display="block"
                  color="$color"
                >
                  {JSON.stringify(mnemonics.error, null)}
                </SizableText>
              </XStack>
            ) : (
              <XStack
                padding="$4"
                backgroundColor="$background"
                borderRadius="$5"
                elevation="$3"
                minHeight={130}
                borderColor="$backgroundHover"
                borderWidth="$0.5"
              >
                <SizableText
                  fontFamily="monospace"
                  fontSize={20}
                  fontWeight="700"
                  display="block"
                >
                  {mnemonics.data?.join(', ')}
                </SizableText>
                <Tooltip content="Copy your seed">
                  <Button
                    icon={Copy}
                    onPress={onCopy}
                    size="$2"
                    position="absolute"
                    top="$2"
                    right="$2"
                  />
                </Tooltip>
              </XStack>
            )}
            <XStack>
              <Button
                size="$2"
                chromeless={!useOwnSeed}
                onPress={() => {
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
  const [displayAvatar, setDisplayAvatar] = useState<string | null>(null)
  const submitValue = useRef({alias: '', bio: '', avatar: ''} as ProfileType)
  function onSubmit() {
    setProfile.mutate(submitValue.current)
  }
  const avatarUrl = displayAvatar
    ? `http://localhost:55001/ipfs/${displayAvatar}`
    : undefined
  console.log({avatarUrl})
  return (
    <StepWrapper>
      <XStack flex={1} gap="$10">
        <YStack flex={1} flexShrink={0}>
          <CurrentStep />
          <H1>Profile</H1>
          <H1>Information</H1>
          <AvatarForm
            onAvatarUpload={async (avatar) => {
              console.log('has new avatar', avatar)
              submitValue.current.avatar = avatar
              setDisplayAvatar(avatar)
            }}
            url={avatarUrl}
          />
          {displayAvatar === null ? (
            <Text>Drag or click to select a profile photo</Text>
          ) : null}
        </YStack>

        <YStack flex={2}>
          <YStack gap="$5" maxWidth={500}>
            <Paragraph size="$6">
              Link your personal data with your new Mintter account. You can
              fill this information later if you prefer.
            </Paragraph>
            <XStack>
              <YStack>
                <Fieldset
                  paddingHorizontal={0}
                  margin={0}
                  borderColor="transparent"
                  borderWidth={0}
                >
                  <Label htmlFor="alias">Alias</Label>
                  <Input
                    id="alias"
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
                  <Label htmlFor="bio">Bio</Label>
                  <TextArea
                    id="bio"
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
        <YStack flex={1} flexShrink={0}>
          <CurrentStep />
          <H1>Crash</H1>
          <H1>Analytics</H1>
        </YStack>

        <YStack flex={2}>
          <YStack gap="$5" maxWidth={500}>
            <Paragraph size="$6">
              Pre-release versions of Mintter automatically send anonymized
              crash reports when things go wrong. This helps us fix bugs and
              improve performance.
            </Paragraph>
            <Paragraph size="$6">
              We strongly believe privacy is a basic human right, so the full
              release of Mintter will never send your data to anyone.
            </Paragraph>
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
        <YStack flex={1} flexShrink={0}>
          <CurrentStep />
          <H1>You are Ready!</H1>
        </YStack>

        <YStack flex={2}>
          <YStack gap="$5" maxWidth={500}>
            <H3>
              You just created your Mintter account. Please share it with others
              and help us spread the word.
            </H3>
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

function StepWrapper({children}: {children: ReactNode}) {
  return (
    <YStack
      borderRadius="$7"
      elevation="$12"
      backgroundColor="$blue1"
      minWidth={678}
      minHeight={300}
      width="60%"
      height="60%"
      maxWidth={1024}
    >
      <YStack alignItems="flex-start" padding="$6">
        <MintterIcon size="$2" color="mint" />
      </YStack>

      <YStack flex={1} padding="$6" gap="$5">
        {children}
      </YStack>
    </YStack>
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

export let obSteps = [
  'welcome',
  'mnemonics',
  'profile',
  'analytics',
  'complete',
] as const

type OBState = {
  stepIndex: number
  key: typeof obSteps[number]
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
      }
    case 'prev':
      if (state.stepIndex == 0) return state
      stepIndex = state.stepIndex - 1
      key = obSteps[stepIndex]
      return {
        ...state,
        stepIndex,
        key,
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
  }, [stepIndex, key])

  return (
    <OnboardingContext.Provider
      value={{
        state,
        dispatch,
      }}
    >
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

export function useOBDispatch() {
  const ob = useContext(OnboardingContext)
  if (!ob)
    throw new Error('useOBDispatch must be used within a OnboardingProvider')
  return ob.dispatch
}
