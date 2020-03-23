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

  async function onSubmit(data) {
    console.log('submit => ', data)
    // debugger
    await router.replace('/welcome/create-password')
  }

  // function handleNext() {
  //   console.log('handleNext -> handleNext', router)
  // }

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
              {idxs.map((n, index) => {
                const key = `word-${n}`
                return (
                  <div key={key} className={`flex ${index && 'mt-12'} `}>
                    <label
                      htmlFor={key}
                      className="w-5 text-body-muted font-light text-right mr-3 text-xs pt-4"
                    >
                      {n + 1}
                    </label>
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        id={key}
                        name={key}
                        ref={register({
                          required: true,
                          validate: {
                            match: value => value === seed[n] || 'not a match',
                          },
                        })}
                      />
                      {errors[key] && (
                        <p
                          className="text-danger text-xs absolute left-0 mt-1"
                          data-testid={`tid-error-word-${n}`}
                        >
                          {errors[key].message}
                        </p>
                      )}
                    </div>

                    <span className="text-success pt-2 pl-2 w-10 h-10">
                      {!errors[key] && formState.dirtyFields.has(key) && (
                        <CheckIcon color="inherit" />
                      )}
                    </span>
                  </div>
                )
              })}
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
