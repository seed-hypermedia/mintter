import {queryKeys} from '@/models/query-keys'
import {eventStream} from '@shm/shared'
import {
  Button,
  CheckboxField,
  Copy,
  copyTextToClipboard,
  Dialog,
  Field,
  Link,
  Onboarding,
  Reload,
  SizableText,
  TextArea,
  toast,
  XStack,
  YStack,
} from '@shm/ui'
import {useMutation} from '@tanstack/react-query'
import {useEffect, useMemo, useRef, useState} from 'react'
import {useQueryInvalidator} from './app-context'
import {useMnemonics, useRegisterKey} from './models/daemon'
import {trpc} from './trpc'
import {useOpenDraft} from './utils/open-draft'

export type NamedKey = {
  name: string
  accountId: string
  publicKey: string
}

const onboardingColor = '#755EFF'

export const [dispatchWizardEvent, wizardEvents] = eventStream<boolean>()
export const [dispatchNewKeyEvent, newKeyEvent] = eventStream<boolean>()

type AccountStep = 'create' | 'complete'

export function AccountWizardDialog() {
  const invalidate = useQueryInvalidator()
  const [open, setOpen] = useState(false)
  const [newAccount, setNewAccount] = useState<null | boolean>(true)
  const [step, setStep] = useState<AccountStep>('create')
  const [existingWords, setExistingWords] = useState<string>('')
  const [isSaveWords, setSaveWords] = useState<null | boolean>(true)
  const [isUserSavingWords, setUserSaveWords] = useState<null | boolean>(null)
  const [isExistingWordsSave, setExistingWordsSave] = useState<boolean>(false)
  const [createdAccount, setCreatedAccount] = useState<string | null>(null)
  const openDraft = useOpenDraft('push')
  const inputWords = useRef<HTMLTextAreaElement | null>(null)

  const saveWords = trpc.secureStorage.write.useMutation()

  const {data: genWords, refetch: refetchWords} = useMnemonics()

  const register = useRegisterKey()

  const addExistingAccount = useMutation({
    mutationFn: async () => {
      let input = []

      let error = isInputValid(words as string)

      if (typeof error == 'string') {
        // this means is an error
        throw Error(`Invalid mnemonics: ${error}`)
      } else {
        input = extractWords(words as string)
      }

      if (input.length == 0) {
        throw Error('No mnemonics')
      }
      let res = await register.mutateAsync({
        mnemonic: input,
        name: 'main',
      })
      return res
    },
  })

  const words = useMemo(() => {
    if (newAccount) {
      return genWords
    } else {
      return existingWords
    }
  }, [genWords, existingWords, newAccount])

  useEffect(() => {
    wizardEvents.subscribe((val) => {
      setOpen(val)
    })
  }, [])

  useEffect(() => {
    if (step == 'create' && !newAccount) {
      // Focus the textarea when changing to this step (better UX!)
      inputWords.current?.focus()
    }
  }, [step, newAccount])

  return (
    <Dialog
      open={open}
      onOpenChange={(val: boolean) => {
        setNewAccount(true)
        setStep('create')
        dispatchWizardEvent(val)
      }}
      defaultValue={false}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          height="100vh"
          bg={'#00000088'}
          width="100vw"
          animation="fast"
          opacity={0.8}
          enterStyle={{opacity: 0}}
          exitStyle={{opacity: 0}}
        />
        <Dialog.Content
          overflow="hidden"
          h={460}
          w="100%"
          maxWidth={600}
          p={0}
          backgroundColor={'$background'}
          animation={[
            'fast',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{y: -10, opacity: 0}}
          exitStyle={{y: -10, opacity: 0}}
        >
          {step == 'create' && newAccount ? (
            <Onboarding.Wrapper>
              <MarketingSection />
              <Onboarding.MainSection>
                <Onboarding.Title>Create a New Account</Onboarding.Title>
                <YStack gap="$2">
                  {words?.length ? (
                    <Field id="words" label="Secret Words">
                      <TextArea
                        borderColor="$colorTransparent"
                        borderWidth={0}
                        id="words"
                        disabled
                        value={(words as Array<string>).join(', ')}
                      />
                    </Field>
                  ) : null}
                  <XStack gap="$4">
                    <Button
                      size="$2"
                      f={1}
                      onPress={() => {
                        refetchWords()
                      }}
                      icon={Reload}
                    >
                      Regenerate
                    </Button>
                    <Button
                      size="$2"
                      f={1}
                      icon={Copy}
                      onPress={() => {
                        copyTextToClipboard(
                          (words as Array<string>).join(', '),
                        ).then(() => {
                          toast.success('Secret words copied successfully')
                        })
                      }}
                    >
                      Copy
                    </Button>
                  </XStack>
                </YStack>
                <YStack>
                  <CheckboxField
                    value={isSaveWords || false}
                    id="register-save-words"
                    onValue={setSaveWords}
                  >
                    Save words on this device
                  </CheckboxField>
                  {!isSaveWords ? (
                    <CheckboxField
                      value={isUserSavingWords || false}
                      id="register-user-save-words"
                      onValue={setUserSaveWords}
                    >
                      <SizableText fontWeight="bold" color="red">
                        I will save my words somewhere else
                      </SizableText>
                    </CheckboxField>
                  ) : null}
                </YStack>
                <YStack gap="$2" marginTop="auto">
                  <Button
                    bg={onboardingColor}
                    color="$color1"
                    borderColor="$colorTransparent"
                    hoverStyle={{
                      bg: onboardingColor,
                      color: '$color1',
                      borderColor: '$colorTransparent',
                    }}
                    f={1}
                    disabled={!isSaveWords && !isUserSavingWords}
                    opacity={!isSaveWords && !isUserSavingWords ? 0.4 : 1}
                    onPress={() => {
                      register
                        .mutateAsync({
                          mnemonic: words as Array<string>,
                          name: 'main',
                        })
                        .then((res) => {
                          if (isSaveWords) {
                            saveWords.mutate({key: 'main', value: words})
                          }
                          invalidate([queryKeys.LOCAL_ACCOUNT_ID_LIST])
                          setCreatedAccount(res.accountId)
                          setStep('complete')
                        })
                    }}
                  >
                    Create new Account
                  </Button>
                  <XStack ai="center">
                    <SizableText size="$2">Have an account?</SizableText>
                    <Button
                      color={onboardingColor}
                      bg="$colorTransparent"
                      chromeless
                      size="$2"
                      p={0}
                      fontWeight="bold"
                      onPress={() => setNewAccount(false)}
                    >
                      Add Existing account.
                    </Button>
                  </XStack>
                </YStack>
              </Onboarding.MainSection>
            </Onboarding.Wrapper>
          ) : null}
          {step == 'create' && !newAccount ? (
            <Onboarding.Wrapper>
              <MarketingSection />
              <Onboarding.MainSection>
                <Onboarding.Title>My secret words</Onboarding.Title>
                <YStack gap="$2">
                  <Field id="input-words" label="Secret Words">
                    <TextArea
                      borderColor="$colorTransparent"
                      borderWidth={0}
                      id="input-words"
                      ref={inputWords}
                      value={existingWords}
                      onChangeText={setExistingWords}
                      placeholder="foo, bar, baz..."
                    />
                  </Field>
                </YStack>
                <CheckboxField
                  value={isExistingWordsSave}
                  onValue={setExistingWordsSave}
                  id="existing-save-words"
                >
                  I have my words save somewhere
                </CheckboxField>
                <YStack gap="$2" marginTop="auto">
                  <Button
                    bg={onboardingColor}
                    color="$color1"
                    borderColor="$colorTransparent"
                    hoverStyle={{
                      bg: onboardingColor,
                      color: '$color1',
                      borderColor: '$colorTransparent',
                    }}
                    f={1}
                    opacity={!isExistingWordsSave ? 0.4 : 1}
                    disabled={!isExistingWordsSave}
                    onPress={() => {
                      addExistingAccount.mutateAsync().then((res) => {
                        invalidate([queryKeys.LOCAL_ACCOUNT_ID_LIST])
                        setCreatedAccount(res.accountId)
                        setStep('complete')
                      })
                    }}
                  >
                    Add Existing account
                  </Button>

                  <XStack ai="center">
                    <SizableText size="$2">Don't have an account?</SizableText>
                    <Button
                      color={onboardingColor}
                      bg="$colorTransparent"
                      chromeless
                      size="$2"
                      p={0}
                      fontWeight="bold"
                      onPress={() => setNewAccount(true)}
                    >
                      Create a new account.
                    </Button>
                  </XStack>
                </YStack>
              </Onboarding.MainSection>
            </Onboarding.Wrapper>
          ) : null}
          {step == 'complete' ? (
            <Onboarding.Wrapper>
              <Onboarding.MainSection ai="center">
                <Onboarding.SuccessIcon />
                <Onboarding.Title>Account Created!</Onboarding.Title>
                <Onboarding.Text>
                  Your account has successfully been created. Check out the
                  things you could do next!
                </Onboarding.Text>
                <YStack gap="$2" alignSelf="stretch" marginTop="auto">
                  <Button
                    size="$3"
                    f={1}
                    onPress={() => {
                      if (createdAccount) {
                        dispatchWizardEvent(false)
                        setNewAccount(true)
                        setStep('create')
                        openDraft({id: createdAccount})
                      }
                    }}
                  >
                    Update my profile
                  </Button>
                  <Button
                    size="$3"
                    f={1}
                    onPress={() => {
                      if (createdAccount) {
                        copyTextToClipboard(createdAccount).then(() => {
                          toast.success('Copied account successfully')
                        })
                      }
                    }}
                    icon={Link}
                  >
                    Share my account with others
                  </Button>
                </YStack>
              </Onboarding.MainSection>
            </Onboarding.Wrapper>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

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

function MarketingSection() {
  return (
    <Onboarding.AccentSection>
      <Onboarding.Title color="$color2">
        Getting started with Seed Hypermedia
      </Onboarding.Title>
      <Onboarding.Text color="$color8">
        Dive into our collaborative documents and join a community that's
        passionate about innovation and shared knowledge.
      </Onboarding.Text>
    </Onboarding.AccentSection>
  )
}
