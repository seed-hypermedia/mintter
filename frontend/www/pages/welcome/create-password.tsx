/* eslint-disable @typescript-eslint/no-explicit-any */
import Layout from '../../components/welcome-layout'
import Container from '../../components/welcome-container'
import Heading from '../../components/welcome-heading'
import P from '../../components/welcome-p'
import {NextButton, BackButton} from '../../components/welcome-buttons'
import Footer from '../../components/footer'
import Content from '../../components/content'
import Input from '../../components/input'
import {useRouter} from 'next/router'
import {useForm} from 'react-hook-form'

import {useWelcome} from '../../shared/welcomeProvider'
import {useState} from 'react'
import ErrorMessage from '../../components/errorMessage'
import {useProfile} from '../../shared/profileContext'

export default function CreatePassword() {
  const {register, watch, handleSubmit, errors, formState} = useForm({
    mode: 'onChange',
  })

  const [submitError, setSubmitError] = useState(null)
  const {initProfile} = useProfile()

  const router = useRouter()
  const psswd = watch('walletPassword')
  const {
    state: {mnemonicList, aezeedPassphrase},
  } = useWelcome()

  async function onSubmit({walletPassword}) {
    try {
      await initProfile({aezeedPassphrase, mnemonicList, walletPassword})
      router.replace('/welcome/edit-profile')
    } catch (err) {
      setSubmitError(err)
    }
  }

  return (
    <form className="lg:flex-1 flex flex-col">
      <Container>
        <Heading>Welcome!</Heading>
        <P className="text-center">
          Set a password to encrypt your identity. This password will be needed
          to unlock your identity in the future
        </P>
        <Content className="flex-wrap flex w-full flex-col">
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
              data-testid="first"
              type="password"
              placeholder="******************"
              ref={register({required: true, minLength: 8})}
            />
            {errors.walletPassword && (
              <p className="text-danger text-xs absolute left-0 mt-1">
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
              data-testid="second"
              type="password"
              placeholder="******************"
              ref={register({
                required: true,
                validate: value => value === psswd,
              })}
            />
            {errors['repeat_walletPassword'] && (
              <p className="text-danger text-xs absolute left-0 mt-1">
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
            <BackButton to="/welcome">← start over</BackButton>
          </div>
        </Container>
      </Footer>
    </form>
  )
}

CreatePassword.Layout = Layout
