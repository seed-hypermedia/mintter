import { DialogTitle } from '@/components/dialog'
import { queryKeys } from '@/models/query-keys'
import { eventStream } from '@shm/shared'
import {
  Button,
  CheckboxField,
  Dialog,
  Label,
  SizableText,
  TextArea,
  XStack,
  YStack,
} from '@shm/ui'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { invalidateQueries } from './app-invalidation'
import { useDeleteKey, useMnemonics, useRegisterKey } from './models/daemon'
import { trpc } from './trpc'

export type NamedKey = {
  name: string
  accountId: string
  publicKey: string
}

export const [dispatchWizardEvent, wizardEvents] = eventStream<boolean>()
export const [dispatchNewKeyEvent, newKeyEvent] = eventStream<boolean>()

type AccountStep = 'start' | 'create' | 'complete'

export function AccountWizardDialog() {
  const [open, setOpen] = useState(false)
  const [newAccount, setNewAccount] = useState<null | boolean>(null)
  const [step, setStep] = useState<AccountStep>('start')
  const [existingWords, setExistingWords] = useState<string>('')
  const [isSaveWords, setSaveWords] = useState<null | boolean>(null)
  const [isExistingWordsSave, setExistingWordsSave] = useState<boolean>(false)

  const saveWords = trpc.secureStorage.write.useMutation()

  const { data: genWords, refetch: refetchWords } = useMnemonics()

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

  const deleteKey = useDeleteKey()

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
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <Dialog.Content
          backgroundColor={'$background'}
          animation={[
            'fast',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ y: -10, opacity: 0 }}
          exitStyle={{ y: -10, opacity: 0 }}
        >
          <DialogTitle>Account</DialogTitle>
          {step == 'start' ? (
            <YStack>
              <SizableText>start</SizableText>
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
            </YStack>
          ) : null}
          {step == 'create' && newAccount ? (
            <YStack gap="$2" width="100%" maxWidth="400px">
              <SizableText>create</SizableText>
              {words?.length ? (
                <TextArea
                  width="300px"
                  disabled
                  value={(words as Array<string>).join(', ')}
                />
              ) : null}
              <Button
                onPress={() => {
                  refetchWords()
                }}
              >
                regenerate
              </Button>
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
                          saveWords.mutate({ key: 'main', value: words })
                        }
                        invalidateQueries(queryKeys.KEYS_LIST)
                        setStep('complete')
                      })
                  }}
                >
                  Create new Account
                </Button>
              </XStack>
            </YStack>
          ) : null}
          {step == 'create' && !newAccount ? (
            <YStack gap="$2" width="100%" maxWidth="400px">
              <Label htmlFor="input-words">My secret words</Label>
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
                    addExistingAccount.mutateAsync().then(() => {
                      invalidateQueries(queryKeys.KEYS_LIST)
                      setStep('complete')
                    })
                  }}
                >
                  Add Existing account
                </Button>
              </XStack>
            </YStack>
          ) : null}
          {step == 'complete' ? (
            <YStack gap="$2" width="100%" maxWidth="400px">
              <SizableText>Account created!</SizableText>
              <Button>Update my profile</Button>
              <Button>Share my account with others</Button>
              <Button onPress={() => dispatchWizardEvent(false)}>close</Button>
            </YStack>
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
