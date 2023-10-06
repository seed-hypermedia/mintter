import NextDocument, {Head, Html, Main, NextScript} from 'next/document'
import {Children} from 'react'
import {AppRegistry} from 'react-native'
import Tamagui from '../tamagui.config'

export default class Document extends NextDocument {
  static async getInitialProps({renderPage}: any) {
    AppRegistry.registerComponent('Main', () => Main)
    const page = await renderPage()

    // @ts-ignore
    const {getStyleElement} = AppRegistry.getApplication('Main')

    /**
     * Note: be sure to keep tamagui styles after react-native-web styles like it is here!
     * So Tamagui styles can override the react-native-web styles.
     */
    const styles = [
      getStyleElement(),
      <style
        key="tamagui-css"
        dangerouslySetInnerHTML={{__html: Tamagui.getCSS()}}
      />,
    ]

    return {...page, styles: Children.toArray(styles)}
  }

  render() {
    return (
      <Html>
        <Head>
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <body>
          {/* this is important to avoid the main container to expand the whole width of the screen */}
          <div>
            <Main />
            <NextScript />
          </div>
        </body>
      </Html>
    )
  }
}
