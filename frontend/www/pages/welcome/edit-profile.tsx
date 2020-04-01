import Layout from '../../components/welcome-layout'
import Container from '../../components/welcome-container'
import Heading from '../../components/welcome-heading'
import P from '../../components/welcome-p'
import {NextButton, BackButton} from '../../components/welcome-buttons'
import Footer from '../../components/footer'
import Content from '../../components/content'
import Input from '../../components/input'
import Textarea from '../../components/textarea'
import {useForm} from 'react-hook-form'
import {useRouter} from 'next/router'
import {useProfile} from '../../shared/profileContext'
import {useFocus} from '../../shared/hooks'
import {css} from 'emotion'

export default function EditProfile() {
  const {register, handleSubmit, errors, formState} = useForm({
    mode: 'onChange',
  })

  const {focusFirst} = useFocus()

  const router = useRouter()
  const {setProfile} = useProfile()

  async function onSubmit(data) {
    try {
      await setProfile(data)
      router.replace('/welcome/complete')
    } catch (err) {
      console.error('Error ==> ', err)
    }
  }

  return (
    <form className="lg:flex-1 flex flex-col">
      <Container>
        <Heading>Edit your profile</Heading>
        <P className="text-center">
          Link your personal data with your new account
        </P>
        <Content className="flex-wrap flex w-full flex-col md:flex-row">
          <div className="pr-8 order-12 md:order-none flex mt-6 md:mt-0 flex-col">
            <label
              className="block text-body-muted text-xs font-semibold mb-1"
              htmlFor="avatar"
            >
              Avatar
            </label>
            <div className="avatar-container overflow-hidden relative bg-background-muted border bg-background-muted border-muted rounded">
              <input
                className="absolute bottom-0 left-0 opacity-0 hover:opacity-100 transition-opacity ease-in-out duration-300 m-4"
                type="file"
              />
            </div>
          </div>
          <div className="flex-col flex flex-1">
            <div className="flex-1 relative">
              <label
                className="block text-body-muted text-xs font-semibold mb-1"
                htmlFor="username"
              >
                Username
              </label>
              <Input
                id="username"
                name="username"
                ref={e => {
                  register(e)
                  focusFirst(e)
                }}
                type="text"
                placeholder="Readable username or alias. Doesn't have to be unique."
              />
            </div>
            <div className="flex-1 relative mt-10">
              <label
                className="block text-body-muted text-xs font-semibold mb-1"
                htmlFor="email"
              >
                Email
              </label>
              <Input
                id="email"
                name="email"
                ref={register({
                  pattern: {
                    value: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                    message: 'Please type a valid email.',
                  },
                })}
                error={!!errors.email}
                type="email"
                placeholder="Real email that could be publically shared"
              />

              {errors.email && (
                <p
                  role="alert"
                  className="text-danger text-xs absolute left-0 mt-1"
                >
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="flex-1 relative mt-10">
              <label
                className="block text-body-muted text-xs font-semibold mb-1"
                htmlFor="bio"
              >
                Bio
              </label>
              <Textarea
                id="bio"
                name="bio"
                ref={register}
                placeholder="A little bit about yourself..."
                className={`block w-full border bg-background-muted border-muted rounded px-3 py-2 focus:outline-none focus:border-muted-hover transition duration-200 text-body-muted focus:text-body ${errors.bio &&
                  'border-danger'} ${css`
                  min-height: 100px;
                `}`}
              />
            </div>
          </div>
        </Content>
      </Container>
      <Footer className="flex-none">
        <Container>
          <div className="flex w-full justify-between flex-row-reverse">
            <NextButton
              onClick={handleSubmit(onSubmit)}
              disabled={!formState.isValid || formState.isSubmitting}
            >
              Next →
            </NextButton>
            <BackButton to="/welcome">← start over</BackButton>
          </div>
        </Container>
      </Footer>
      <style jsx>{`
        .avatar-container {
          width: 200px;
          height: 200px;
        }
      `}</style>
    </form>
  )
}

EditProfile.Layout = Layout
