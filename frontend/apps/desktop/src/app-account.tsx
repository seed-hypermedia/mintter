import {queryKeys} from '@/models/query-keys'
import {eventStream} from '@shm/shared'
import {
  Button,
  CheckboxField,
  Dialog,
  Onboarding,
  TextArea,
  XStack,
} from '@shm/ui'
import {useMutation} from '@tanstack/react-query'
import {useEffect, useMemo, useState} from 'react'
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

type AccountStep = 'start' | 'create' | 'complete'

export function AccountWizardDialog() {
  const invalidate = useQueryInvalidator()
  const [open, setOpen] = useState(false)
  const [newAccount, setNewAccount] = useState<null | boolean>(null)
  const [step, setStep] = useState<AccountStep>('start')
  const [existingWords, setExistingWords] = useState<string>('')
  const [isSaveWords, setSaveWords] = useState<null | boolean>(null)
  const [isExistingWordsSave, setExistingWordsSave] = useState<boolean>(false)
  const [createdAccount, setCreatedAccount] = useState<string | null>(null)
  const openDraft = useOpenDraft('push')

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

  return (
    <Dialog
      open={open}
      onOpenChange={(val: boolean) => {
        setNewAccount(null)
        setStep('start')
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
          h={430}
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
          {step == 'start' ? (
            <Onboarding.Wrapper>
              <MarketingSection />
              <Onboarding.MainSection>
                <Button
                  onPress={() => {
                    setNewAccount(true)
                    setSaveWords(true)
                    setStep('create')
                  }}
                >
                  Create a new Account
                </Button>
                <Button
                  onPress={() => {
                    setNewAccount(false)
                    setSaveWords(false)
                    setStep('create')
                  }}
                >
                  Add existing account
                </Button>
              </Onboarding.MainSection>
            </Onboarding.Wrapper>
          ) : null}
          {step == 'create' && newAccount ? (
            <Onboarding.Wrapper>
              <MarketingSection />
              <Onboarding.MainSection>
                <Onboarding.Title>Create a New Account</Onboarding.Title>
                {words?.length ? (
                  <TextArea
                    disabled
                    value={(words as Array<string>).join(', ')}
                  />
                ) : null}
                <XStack gap="$4">
                  <Button
                    f={1}
                    onPress={() => {
                      refetchWords()
                    }}
                  >
                    regenerate
                  </Button>
                  <Button f={1}>Copy</Button>
                </XStack>
                <CheckboxField
                  value={isSaveWords}
                  id="register-save-words"
                  onValue={setSaveWords}
                >
                  Save words on this device
                </CheckboxField>
                <XStack gap="$2">
                  <Button
                    f={1}
                    onPress={() => {
                      setNewAccount(null)
                      setSaveWords(null)
                      setStep('start')
                    }}
                  >
                    Prev
                  </Button>
                  <Button
                    f={1}
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
                          invalidate([queryKeys.KEYS_LIST])
                          setCreatedAccount(res.accountId)
                          setStep('complete')
                        })
                    }}
                  >
                    Create new Account
                  </Button>
                </XStack>
              </Onboarding.MainSection>
            </Onboarding.Wrapper>
          ) : null}
          {step == 'create' && !newAccount ? (
            <Onboarding.Wrapper>
              <MarketingSection />
              <Onboarding.MainSection>
                <Onboarding.Title>My secret words</Onboarding.Title>
                <TextArea
                  id="input-words"
                  width="300px"
                  value={existingWords}
                  onChangeText={setExistingWords}
                />
                <CheckboxField
                  value={isExistingWordsSave}
                  onValue={setExistingWordsSave}
                  id="existing-save-words"
                >
                  I have my words save somewhere
                </CheckboxField>
                <XStack gap="$2">
                  <Button
                    f={1}
                    onPress={() => {
                      setNewAccount(null)
                      setStep('start')
                    }}
                  >
                    Prev
                  </Button>
                  <Button
                    f={1}
                    opacity={!isExistingWordsSave ? 0.4 : 1}
                    hoverStyle={{
                      cursor: isExistingWordsSave
                        ? 'pointer'
                        : 'not-allowed !important',
                    }}
                    disabled={!isExistingWordsSave}
                    onPress={() => {
                      addExistingAccount.mutateAsync().then((res) => {
                        invalidate([queryKeys.KEYS_LIST])
                        setCreatedAccount(res.accountId)
                        setStep('complete')
                      })
                    }}
                  >
                    Add Existing account
                  </Button>
                </XStack>
              </Onboarding.MainSection>
            </Onboarding.Wrapper>
          ) : null}
          {step == 'complete' ? (
            <Onboarding.Wrapper>
              <Onboarding.AccentSection />
              <Onboarding.MainSection ai="center">
                <Onboarding.SuccessIcon />
                <Onboarding.Title>Account Created!</Onboarding.Title>
                <Onboarding.Text>
                  Your account has successfully been created. Check out the
                  things you could do next!
                </Onboarding.Text>
                <Button
                  f={1}
                  onPress={() => {
                    if (createdAccount) {
                      dispatchWizardEvent(false)
                      setNewAccount(null)
                      setStep('start')
                      openDraft({id: createdAccount})
                    }
                  }}
                >
                  Update my profile
                </Button>
                <Button f={1} onPress={() => dispatchWizardEvent(false)}>
                  close
                </Button>
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
