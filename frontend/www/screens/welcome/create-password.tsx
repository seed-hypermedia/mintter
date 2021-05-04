import Container from 'components/container'
import {Heading} from 'components/heading'
import P from 'components/welcome-p'
import {NextButton, BackButton} from 'components/welcome-buttons'
import Footer from 'components/footer'
import Content from 'components/content'
import {Input} from 'components/input'
import {useForm} from 'react-hook-form'

import {useWelcome} from 'shared/welcome-provider'
import {useState} from 'react'
import {ErrorMessage} from 'components/error-message'
import {useProfileContext} from 'shared/profile-context'
import {useFocus} from 'shared/hooks'
import {useRouter} from 'shared/use-router'
import {getPath} from 'components/routes'

export default function CreatePassword() {
  const {register, watch, handleSubmit, errors, formState} = useForm({
    mode: 'onChange',
  })

  const [submitError, setSubmitError] = useState(null)
  const {createProfile} = useProfileContext()

  const {history, match} = useRouter()
  const {focusFirst} = useFocus()
  const psswd = watch('walletPassword')

  const {
    state: {mnemonicList, aezeedPassphrase},
  } = useWelcome()

  async function onSubmit({walletPassword}) {
    try {
      createProfile({aezeedPassphrase, mnemonicList, walletPassword})
      history.replace(`${getPath(match)}/welcome/edit-profile`)
    } catch (err) {
      setSubmitError(err)
    }
  }

  return (
    <form className="lg:flex-1 flex flex-col">
      <Container>
        <Heading>Welcome!</Heading>
        <P className="text-center">
          Set a password to encrypt your account. This password will be needed
          to unlock your account in the future
        </P>
        <Content className="flex flex-col w-full items-center">
          <div className="flex-1 relative">
            <label
              className="block text-body-muted text-xs font-semibold mb-1"
              htmlFor="walletPassword"
            >
              Password
            </label>
            <Input
              name="walletPassword"
              id="walletPassword"
              data-testid="tid-input-password1"
              type="password"
              placeholder="******************"
              ref={(e: HTMLInputElement) => {
                register({required: true, minLength: 8})(e)
                focusFirst(e)
              }}
            />
            {errors.walletPassword && (
              <p
                role="alert"
                data-testid="tid-error-password1"
                className="text-danger text-xs absolute left-0 mt-1"
              >
                Please choose a password with more than 8 characters.
              </p>
            )}
          </div>
          <div className="flex-1 relative mt-12">
            <label
              className="block text-body-muted text-xs font-semibold mb-1"
              htmlFor="repeat_walletPassword"
            >
              Retype Password
            </label>
            <Input
              name="repeat_walletPassword"
              id="repeat_walletPassword"
              data-testid="tid-input-password2"
              type="password"
              placeholder="******************"
              ref={register({
                required: true,
                validate: value => value === psswd,
              })}
            />
            {errors['repeat_walletPassword'] && (
              <p
                role="alert"
                data-testid="tid-error-password2"
                className="text-danger text-xs absolute left-0 mt-1"
              >
                Password must match
              </p>
            )}
          </div>
          <ErrorMessage error={submitError} />
        </Content>
      </Container>
      <Footer className="flex-none">
        <Container>
          <div className="flex w-full justify-between flex-row-reverse">
            <NextButton
              type="submit"
              onClick={handleSubmit(onSubmit)}
              disabled={!formState.isValid || formState.isSubmitting}
              data-testid="next-btn"
            >
              Next →
            </NextButton>
            <BackButton to={`${getPath(match)}/welcome`}>
              ← start over
            </BackButton>
          </div>
        </Container>
      </Footer>
    </form>
  )
}
