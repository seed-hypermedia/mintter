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

export default function CreatePassword() {
  const {register, watch, handleSubmit, errors} = useForm({
    mode: 'onChange',
  })

  const router = useRouter()

  function onSubmit(data) {
    console.log('submit => ', data)
  }

  async function handleNext(e) {
    await handleSubmit(onSubmit)(e)
    await router.push('/welcome/edit-profile')
  }

  const psswd = watch('password')
  return (
    <Layout>
      <form>
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
                  Please choose a password.
                </p>
              )}
            </div>
          </Content>
        </Container>
        <Footer className="flex-none">
          <Container>
            <div className="flex w-full justify-between">
              <BackButton
                to="/welcome"
                onClick={() => console.log('starting over!')}
              >
                ← start over
              </BackButton>
              <NextButton
                type="submit"
                onClick={handleNext}
                disabled={Object.keys(errors).length !== 0}
              >
                Next →
              </NextButton>
            </div>
          </Container>
        </Footer>
      </form>
    </Layout>
  )
}
