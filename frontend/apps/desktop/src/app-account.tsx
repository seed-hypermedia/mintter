import {useGRPCClient} from '@shm/app/app-context'
import {DialogTitle} from '@shm/app/components/dialog'
import {queryKeys} from '@shm/app/models/query-keys'
import {eventStream} from '@shm/shared'
import {
  Add,
  Button,
  CheckboxField,
  Dialog,
  Label,
  SizableText,
  TextArea,
  XStack,
  YStack,
} from '@shm/ui'
import {useMutation, useQuery} from '@tanstack/react-query'
import {useEffect, useMemo, useState} from 'react'
import {trpc} from './trpc'

export type NamedKey = {
  name: string
  accountId: string
  publicKey: string
}

let [dispatchWizardEvent, wizardEvents] = eventStream<boolean>()
let [dispatchNewKeyEvent, newKeyEvent] = eventStream<boolean>()

export function CurrentAccountSidebarSection() {
  const read = trpc.secureStorage.read.useQuery('main')

  console.log(`== ~ CurrentAccountSidebarSection ~ read:`, read.data)
  return (
    <XStack>
      <Button
        icon={Add}
        chromeless
        borderRadius={0}
        f={1}
        onPress={() => {
          dispatchWizardEvent(true)
        }}
      >
        Add Account
      </Button>
    </XStack>
  )

  return null
}

type AccountStep = 'start' | 'create' | 'complete'

export function AccountWizardDialog() {
  const client = useGRPCClient()
  const [open, setOpen] = useState(false)
  const [newAccount, setNewAccount] = useState<null | boolean>(null)
  const [step, setStep] = useState<AccountStep>('start')
  const [existingWords, setExistingWords] = useState<string>('')
  const [isSaveWords, setSaveWords] = useState<null | boolean>(null)

  const saveWords = trpc.secureStorage.write.useMutation()
  const {refetch: refetchKeys} = useQuery({
    queryKey: ['LIST_KEYS'],
    queryFn: async () => {
      const res = await client.daemon.listKeys({})
      return res.keys
    },
  })

  const {data: genWords, refetch: refetchWords} = useQuery({
    queryKey: [queryKeys.GENERATE_MNEMONIC],
    enabled: step == 'create' && newAccount == true,
    queryFn: async () => {
      const words = await client.daemon.genMnemonic({})
      return words.mnemonic
    },
  })

  const register = useMutation({
    // queryKey: ['REGISTER_KEY'],
    mutationFn: async () => {
      const res = await client.daemon.registerKey({
        mnemonic: words as Array<string>,
        name: 'main',
      })
      return res
    },
  })

  const addExistingAccount = useMutation({
    // queryKey: ['REGISTER_KEY'],
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
      console.log('--- ADD EXISTING ACCOUNT', input)
      const res = await client.daemon.registerKey({
        mnemonic: input,
        name: 'main',
      })
      return res
    },
  })

  const deleteKey = useMutation({
    // queryKey: ['REGISTER_KEY'],
    mutationFn: async () => {
      const res = await client.daemon.deleteKey({
        name: 'main',
      })

      console.log('== REGISTER', res)
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
              <Button
                onPress={() => {
                  deleteKey.mutateAsync()
                }}
              >
                Remove key (dev)
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
                    register.mutateAsync().then((res) => {
                      if (isSaveWords) {
                        console.log('== SAVE WORDS TOO!')
                        // TODO: @Eric here we need to store the words
                        saveWords.mutate({key: 'main', value: words})
                      }
                      refetchKeys()
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
                  onPress={() => {
                    addExistingAccount.mutateAsync().then(() => {
                      refetchKeys()
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
