import React, {useEffect, useState} from 'react'
import {useForm} from 'react-hook-form'
import Seo from 'components/seo'
import Content from 'components/content'
import Input from 'components/input'
import Textarea from 'components/textarea'
import {ProfileAddress} from 'components/profile-address'
import {ErrorMessage, ErrorInterface} from 'components/errorMessage'
import {useProfile, useProfileContext} from 'shared/profileContext'
import Container from 'components/container'
import {useToasts} from 'react-toast-notifications'
import {css} from 'emotion'
import {Page} from 'components/page'
import {MainColumn} from 'components/main-column'

export default function Settings() {
  const {setProfile} = useProfileContext()
  const {data: profile} = useProfile()
  const {addToast, updateToast} = useToasts()
  const [submitError, setSubmitError] = React.useState<ErrorInterface>()
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
    if (profile) {
      const formData = Object.keys(profile).map(v => ({[v]: profile[v]}))
      setValue(formData)
    }
  }, [profile])

  async function onSubmit(data) {
    const toast = addToast('Updating profile...', {
      appearance: 'info',
      autoDismiss: false,
    })
    try {
      await setProfile(data)
      updateToast(toast, {
        autoDismiss: true,
        content: 'Update Successfull!',
        appearance: 'success',
      })
    } catch (err) {
      updateToast(toast, {
        autoDismiss: true,
        content: err.message,
        appearance: 'error',
      })
      setSubmitError(err)
    }
  }

  return (
    <>
      <Seo title="Settings" />
      <Page>
        <MainColumn>
          <form
            className="rounded pb-12 mb-4 w-full"
            onSubmit={handleSubmit(onSubmit)}
          >
            <h1 className="text-4xl font-bold text-heading">Settings</h1>
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
              </div>
              <hr className="border-t-2 border-muted border-solid mt-10" />
              <p className="block text-white text-xs font-semibold bg-info rounded px-4 py-2 mt-8">
                All your Mintter content is located in{' '}
                <code className="mx-1">~/.mtt/</code>
              </p>
              <div className="flex-1 relative mt-10">
                <label
                  className="block text-body-muted text-xs font-semibold mb-1"
                  htmlFor="accountId"
                >
                  Account Id
                </label>
                <Input
                  ref={register}
                  id="accountId"
                  name="accountId"
                  disabled
                  type="text"
                />
              </div>
              <ProfileAddress className="mt-10" />
            </div>
            <ErrorMessage error={submitError} />
          </form>
        </MainColumn>

        <style jsx>{`
          .avatar-container {
            width: 200px;
            height: 200px;
          }
        `}</style>
      </Page>
    </>
  )
}
