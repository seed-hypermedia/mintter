import {useEffect, useState} from 'react'
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
import {getRandomElements} from '../../shared/utils'
import {useWelcome} from '../../shared/welcomeProvider'

export default function RetypeSeed() {
  const {register, handleSubmit, errors, formState} = useForm({
    mode: 'onChange',
  })

  const router = useRouter()

  const {
    state: {seed},
  } = useWelcome()

  const [idxs, setIdxs] = useState<number[]>([])

  useEffect(() => {
    setIdxs(getRandomElements(seed))
  }, [])

  function onSubmit(data) {
    console.log('submit => ', data)

    router.replace('/welcome/create-password')
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
          <P className="text-center font-bold">{`${idxs[0] + 1}, ${idxs[1] +
            1} & ${idxs[2] + 1}`}</P>
          <P className="text-center">{`(${seed[idxs[0]]}, ${seed[idxs[1]]}, ${
            seed[idxs[2]]
          })`}</P>
          <Content className="flex-wrap flex w-full">
            <div className="flex flex-col w-full items-center">
              {idxs.map(n => (
                <div key={`word-${n}`} className="flex">
                  <label
                    htmlFor={`word-${n}`}
                    className="w-5 text-gray-500 font-light text-right mr-3 text-xs pt-4"
                  >
                    {n + 1}
                  </label>
                  <div className="flex-1 relative mb-12">
                    <Input
                      type="text"
                      id={`word-${n}`}
                      name={`word-${n}`}
                      ref={register({
                        required: true,
                        validate: value => value === seed[n],
                      })}
                    />
                    {errors[`word-${n}`] && (
                      <p
                        className="text-red-500 text-xs absolute left-0 mt-1"
                        data-testid={`tid-error-word-${n}`}
                      >
                        this word is not correct
                      </p>
                    )}
                  </div>

                  <span className="text-green-500 pt-2 pl-2 w-10 h-10">
                    {!errors[`word-${n}`] &&
                      formState.dirtyFields[`word-${n}`] && (
                        <CheckIcon color="inherit" />
                      )}
                  </span>
                </div>
              ))}
            </div>
          </Content>
        </Container>
        <Footer className="flex-none">
          <Container>
            <div className="flex w-full justify-between flex-row-reverse">
              <NextButton
                type="submit"
                onClick={handleSubmit(onSubmit)}
                disabled={!formState.isValid && !formState.isSubmitting}
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

RetypeSeed.Layout = Layout
