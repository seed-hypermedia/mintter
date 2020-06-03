import React, {useEffect, useState} from 'react'
import Seo from 'components/seo'
import Content from 'components/content'
import Input from 'components/input'
import Textarea from 'components/textarea'
import {motion, AnimatePresence} from 'framer-motion'
import {useForm} from 'react-hook-form'
import {ErrorMessage, ErrorInterface} from 'components/errorMessage'
import {GetProfileAddrsRequest} from '@mintter/proto/mintter_pb'
import {usersClient} from 'shared/mintterClient'
import {MainLayout} from 'components/main-layout'
import {useProfile} from 'shared/profileContext'

export default function Settings() {
  const {getProfile, setProfile} = useProfile()
  const [success, setSuccess] = React.useState<boolean>(false)
  const [submitError, setSubmitError] = React.useState<ErrorInterface>()
  const [addresses, setAddresses] = useState<string[]>()
  const {register, handleSubmit, errors, formState, setValue} = useForm({
    mode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      bio: '',
      accountId: '',
    },
  })

  useEffect(() => {
    initProfile()

    async function initProfile() {
      const values = await (await getProfile()).toObject()
      console.log('initProfile -> values', values)

      const data = Object.keys(values).map(v => ({[v]: values[v]}))
      setValue(data)
    }
  }, [])

  useEffect(() => {
    async function initAddresses() {
      const req = new GetProfileAddrsRequest()
      const res = await usersClient.getProfileAddrs(req)
      setAddresses(res.toObject().addrsList)
    }

    initAddresses()
  }, [])

  async function onSubmit(data) {
    try {
      await setProfile(data)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setSuccess(false)
      setSubmitError(err)
      console.error('Settings::editProfile Error ==> ', err)
    }
  }

  return (
    <>
      <Content>
        <Seo title="Settings" />
        <form
          className="rounded pb-8 mb-4 w-full max-w-3xl"
          onSubmit={handleSubmit(onSubmit)}
        >
          <h1 className="py-5 text-4xl font-bold text-heading">Settings</h1>
          {/* // TODO: render avatar when the API is ready to accept images
              <div className="pr-8 order-12 md:order-none flex mt-6 md:mt-0 flex-col">
                <label
                  className="block text-body-muted text-xs font-semibold mb-1"
                  htmlFor="avatar"
                >
                  Avatar
                </label>
                <div className="avatar-container overflow-hidden relative bg-background-muted border bg-background-muted border-muted rounded">
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
                minHeight={100}
                placeholder="A little bit about yourself..."
                className={`block w-full border bg-background-muted border-muted rounded px-3 py-2 focus:outline-none focus:border-muted-hover transition duration-200 text-body-muted focus:text-body ${errors.bio &&
                  'border-danger'}`}
              />
            </div>
            <div className="flex-1 flex items-center relative mt-10">
              <button
                type="submit"
                disabled={!formState.isValid}
                className={`text-success border px-4 py-2 rounded transition duration-200 ${
                  !formState.isValid
                    ? 'opacity-50 hover:bg-transparent cursor-not-allowed'
                    : 'border-success opacity-100 hover:bg-success hover:text-white'
                }`}
              >
                Save
              </button>
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{opacity: 0, y: 10}}
                    animate={{opacity: 1, y: 0}}
                    exit={{
                      opacity: 0,
                      y: -10,
                      transition: {duration: 0.2},
                    }}
                  >
                    <p className="flex-1 mx-4 text-green-500">saved!</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex-1 relative mt-10">
              <label
                className="block text-body-muted text-xs font-semibold mb-1"
                htmlFor="accountId"
              >
                Account Id
              </label>
              <Input
                id="accountId"
                name="accountId"
                disabled
                ref={register}
                type="text"
              />
            </div>

            <div className="mt-10">
              <label
                className="block text-body-muted text-xs font-semibold mb-1"
                htmlFor="addresses"
              >
                your Mintter addresses
              </label>

              <Textarea
                readOnly
                minHeight={200}
                id="addresses"
                className="block text-body-muted w-full border bg-background-muted border-muted rounded px-3 py-2"
                value={addresses && addresses.join('\n\n')}
              />
            </div>
          </div>
          <ErrorMessage error={submitError} />
        </form>
      </Content>

      <style jsx>{`
        .avatar-container {
          width: 200px;
          height: 200px;
        }
      `}</style>
    </>
  )
}

Settings.Layout = MainLayout
