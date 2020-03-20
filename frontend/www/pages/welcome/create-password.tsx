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
import {InitProfileRequest} from '@mintter/proto/mintter_pb'
import {useWelcome} from '../../shared/welcomeProvider'
import {useRPC} from '../../shared/rpc'
export default function CreatePassword() {
  const {register, watch, handleSubmit, errors, formState} = useForm({
    mode: 'onChange',
  })

  const router = useRouter()
  const psswd = watch('password')
  const {
    state: {seed, passphrase},
  } = useWelcome()

  const rpc = useRPC()

  async function onSubmit(data) {
    console.log('submit => ', data)

    const req = new InitProfileRequest()
    req.setAezeedPassphrase(passphrase)
    req.setMnemonicList(seed)
    req.setWalletPassword(psswd)

    const resp = await rpc.initProfile(req)
    console.log(resp)

    await router.push('/welcome/edit-profile')
  }

  return (
    <>
      <form className="lg:flex-1 flex flex-col">
        <Container>
          <Heading>Welcome!</Heading>
          <P className="text-center">
            Set a password to encrypt your identity. This password will be
            needed to unlock your identity in the future
          </P>
          <Content className="flex-wrap flex w-full flex-col">
            <div className="flex-1">
              <label
                className="block text-gray-500 text-xs font-semibold mb-1"
                htmlFor="password"
              >
                Password
              </label>
              <Input
                name="password"
                id="password"
                type="password"
                placeholder="******************"
                ref={register({required: true, minLength: 8})}
              />
              {errors.password && (
                <p className="text-red-500 text-xs italic">
                  Please choose a password with more than 8 characters.
                </p>
              )}
            </div>
            <div className="flex-1 mt-6">
              <label
                className="block text-gray-500 text-xs font-semibold mb-1"
                htmlFor="repeat_password"
              >
                Retype Password
              </label>
              <Input
                name="repeat_password"
                id="repeat_password"
                type="password"
                placeholder="******************"
                ref={register({
                  required: true,
                  validate: value => value === psswd,
                })}
              />
              {errors.repeat_password && (
                <p className="text-red-500 text-xs italic">
                  Password must match
                </p>
              )}
            </div>
          </Content>
        </Container>
        <Footer className="flex-none">
          <Container>
            <div className="flex w-full justify-between flex-row-reverse">
              <NextButton
                type="submit"
                onClick={handleSubmit(onSubmit)}
                disabled={!formState.isValid || formState.isSubmitting}
              >
                Next →
              </NextButton>
              <BackButton to="/welcome">← start over</BackButton>
            </div>
          </Container>
        </Footer>
      </form>
    </>
  )
}

CreatePassword.Layout = Layout
