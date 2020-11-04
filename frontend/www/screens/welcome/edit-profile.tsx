import {useHistory} from 'react-router-dom'
import Container from 'components/welcome-container'
import Heading from 'components/welcome-heading'
import P from 'components/welcome-p'
import {NextButton, BackButton} from 'components/welcome-buttons'
import Footer from 'components/footer'
import Content from 'components/content'
import Input from 'components/input'
import Textarea from 'components/textarea'
import {useForm} from 'react-hook-form'
import {useProfile, useProfileContext} from 'shared/profileContext'
import {useFocus} from 'shared/hooks'
import {css} from 'emotion'

export default function EditProfile() {
  const {register, handleSubmit, errors, formState} = useForm({
    mode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      bio: '',
      accountId: '',
    },
  })

  const {focusFirst} = useFocus()

  const history = useHistory()
  const {setProfile} = useProfileContext()
  const {data: profile} = useProfile()

  async function onSubmit(data) {
    try {
      setProfile(data)
      history.replace('/private/welcome/complete')
    } catch (err) {
      console.error('Error ==> ', err)
    }
  }

  return (
    <form className="lg:flex-1 flex flex-col">
      <Container className="mx-auto">
        <Heading>Edit your profile</Heading>
        <P className="text-center">
          Link your personal data with your new account
        </P>
        <Content className="flex-wrap flex w-full flex-col md:flex-row">
          {/* // TODO: render avatar when the API is ready to accept images
          <div className="pr-8 order-12 md:order-none flex mt-6 md:mt-0 flex-col">
            <label
              className="block text-body-muted text-xs font-semibold mb-1"
              htmlFor="avatar"
            >
              Avatar
            </label>
            <div className="avatar-container overflow-hidden relative bg-background-muted border bg-background-muted border-muted  rounded">
              <input
                name="avatar"
                id="avatar"
                ref={register}
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
                    value: /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
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
                  data-testid="email-error"
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
                rows={4}
                placeholder="A little bit about yourself..."
                className={`block w-full border bg-background-muted border-muted rounded px-3 py-2 focus:outline-none focus:border-muted-hover transition duration-200 text-body-muted focus:text-body text-base ${errors.bio &&
                  'border-danger'} ${css`
                  min-height: 100px;
                `}`}
              />
            </div>
          </div>
        </Content>
      </Container>
      <Footer className="flex-none">
        <Container className="mx-auto">
          <div className="flex w-full justify-between flex-row-reverse">
            <NextButton
              onClick={handleSubmit(onSubmit)}
              disabled={!formState.isValid || formState.isSubmitting}
              data-testid="next-btn"
            >
              Next →
            </NextButton>
            <BackButton to="/private/welcome">← start over</BackButton>
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
