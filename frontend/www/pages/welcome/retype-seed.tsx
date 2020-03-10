import Layout from '../../components/welcome-layout'
import Container from '../../components/welcome-container'
import Heading from '../../components/welcome-heading'
import P from '../../components/welcome-p'
import {NextButton, BackButton} from '../../components/welcome-buttons'
import Footer from '../../components/footer'
import Content from '../../components/content'
import {useRouter} from 'next/router'
import {useForm} from 'react-hook-form'

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
  const {register, handleSubmit, errors} = useForm({
    mode: 'onChange',
  })

  const router = useRouter()

  function onSubmit(data) {
    console.log('submit => ', data)
  }

  async function handleNext(e) {
    await handleSubmit(onSubmit)(e)
    await router.push('/welcome/create-password')
  }

  return (
    <Layout>
      <form>
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
            <div className="flex flex-col items-center w-full">
              {words.map(word => (
                <>
                  <div key={word.key} className="flex items-center p-3">
                    <span className="w-5 text-gray-500 font-light text-right mr-3 text-xs">
                      {word.key}
                    </span>
                    <input
                      type="text"
                      name={`word-${word.key}`}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:shadow-outline"
                      ref={register({
                        required: true,
                        validate: value => value === word.value,
                      })}
                    />
                  </div>
                  {errors[`word-${word.key}`] && (
                    <p className=" text-red-500 text-sm ">
                      this word is not correct
                    </p>
                  )}
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
