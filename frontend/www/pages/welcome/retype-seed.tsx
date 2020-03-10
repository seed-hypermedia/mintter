import {useEffect} from 'react'
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
import CheckIcon from '@material-ui/icons/Check'

const words = [
  {
    key: 23,
    value: 'repeat',
  },
  {
    key: 16,
    value: 'rule',
  },
  {
    key: 1,
    value: 'black',
  },
]

export default function RetypeSeed() {
  const {register, handleSubmit, errors, formState} = useForm({
    mode: 'onChange',
  })

  const router = useRouter()

  async function onSubmit(data) {
    console.log('submit => ', data)
    await router.push('/welcome/create-password')
  }

  return (
    <>
      <form className="lg:flex-1 flex flex-col">
        <Container>
          <Heading>Retype your seed</Heading>
          <P className="text-center">
            Your seed is important! If you lose your seed you'll have no way to
            recover your identity. To make sure that you have properly saved
            your seed, please retype the words
          </P>
          <P className="text-center font-bold">23, 16 & 1</P>
          <P className="text-center">(repeat, rule, black)</P>
          <Content className="flex-wrap flex w-full">
            <div className="flex flex-col w-full items-center">
              {words.map(word => (
                <>
                  <div key={word.key} className="flex">
                    <span className="w-5 text-gray-500 font-light text-right mr-3 text-xs pt-4">
                      {word.key}
                    </span>
                    <div className="flex-1 relative mb-12">
                      <Input
                        type="text"
                        name={`word-${word.key}`}
                        ref={register({
                          required: true,
                          validate: value => value === word.value,
                        })}
                      />
                      {errors[`word-${word.key}`] && (
                        <p className=" text-red-500 text-xs absolute left-0 mt-1">
                          this word is not correct
                        </p>
                      )}
                    </div>

                    <span className="text-green-500 pt-2 pl-2 w-10 h-10">
                      {!errors[`word-${word.key}`] &&
                        formState.dirtyFields[`word-${word.key}`] && (
                          <CheckIcon color="inherit" />
                        )}
                    </span>
                  </div>
                </>
              ))}
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
                onClick={handleSubmit(onSubmit)}
                disabled={!formState.isValid && !formState.isSubmitting}
              >
                Next →
              </NextButton>
            </div>
          </Container>
        </Footer>
      </form>
    </>
  )
}

RetypeSeed.Layout = Layout
