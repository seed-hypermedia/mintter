import {useEffect, useState} from 'react'
import QRCode from 'qrcode-react'

import Heading from '../../components/welcome-heading'
import Container from '../../components/welcome-container'
import Layout from '../../components/welcome-layout'
import P from '../../components/welcome-p'
import {NextButton} from '../../components/welcome-buttons'
import Footer from '../../components/footer'
import {useRouter} from 'next/router'
import {useWelcome} from '../../shared/welcomeProvider'
import {useProfile} from '../../shared/profileContext'

export default function WelcomeIndex() {
  const router = useRouter()
  const {dispatch} = useWelcome()
  const {profile} = useProfile()
  console.log('WelcomeIndex -> profile', profile)

  function handleNext() {
    dispatch({type: 'reset'})
    router.push('/app/library')
  }

  useEffect(() => {
    //generate QR
  }, [])

  return (
    <>
      <Container className="lg:flex-1">
        <Heading>Complete!</Heading>
        <P>
          Here's your new Mintter Profile. Please share it with others and the
          world!!
        </P>
        {profile && (
          <div className="bg-white p-2 rounded m-8">
            {profile && profile.current && (
              <QRCode
                value={profile.current.getPeerId()}
                size={320}
                logo="/logo.png"
                logoWidth={320 * 0.3}
              />
            )}
          </div>
        )}
      </Container>
      <Footer className="flex-none">
        <Container>
          <NextButton
            onClick={handleNext}
            className="text-2xl font-light px-10"
          >
            Open the app
          </NextButton>
        </Container>
      </Footer>
    </>
  )
}

WelcomeIndex.Layout = Layout
