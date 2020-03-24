import Layout from '../../components/welcome-layout'
import Container from '../../components/welcome-container'
import Heading from '../../components/welcome-heading'
import P from '../../components/welcome-p'
import {NextButton, BackButton} from '../../components/welcome-buttons'
import Footer from '../../components/footer'
import Content from '../../components/content'
import Input from '../../components/input'
import {useForm} from 'react-hook-form'
import {useRouter} from 'next/router'
import {useProfile} from '../../shared/profileContext'

export default function EditProfile() {
  const {register, handleSubmit, errors, formState} = useForm({
    mode: 'onChange',
  })

  const router = useRouter()
  const {profile, setProfile} = useProfile()

  async function onSubmit(data) {
    await setProfile(data)
    router.replace('/welcome/complete')
  }

  return (
    <>
      <Container>
        <Heading>Edit your profile</Heading>
        <P className="text-center">
          Link your personal data with your new identity
        </P>
        <Content className="flex-wrap flex w-full flex-col md:flex-row">
          {/* <div className="pr-8 order-12 md:order-none flex mt-6 md:mt-0 flex-col">
            <label
              className="block text-body-muted text-xs font-semibold mb-1"
              htmlFor="avatar"
            >
              Avatar
            </label>
            <div className="avatar-container overflow-hidden relative bg-background-muted rounded-sm">
              <input
                className="absolute bottom-0 left-0 opacity-0 hover:opacity-100 transition-opacity ease-in-out duration-300 m-4"
                type="file"
              />
            </div>
          </div> */}
          <div className="flex-col flex flex-1">
            <div className="flex-1 relative">
              <label
                className="block text-body-muted text-xs font-semibold mb-1"
                htmlFor="username"
              >
                Username
              </label>
              <Input
                name="username"
                ref={register}
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
                <p className="text-danger text-xs absolute left-0 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="flex-1 relative mt-10">
              <label
                className="block text-body-muted text-xs font-semibold mb-1"
                htmlFor="twitterUsername"
              >
                Twitter
              </label>
              <Input
                name="twitterUsername"
                ref={register}
                type="text"
                placeholder="Twitter handle including @ symbol (@YOUR_USERNAME)"
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
    </>
  )
}

EditProfile.Layout = Layout
