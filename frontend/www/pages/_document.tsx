import Document, {Html, Head, Main, NextScript} from 'next/document'

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx)
    return {...initialProps}
  }

  render() {
    return (
      <Html className="bg-background">
        <Head />
        <body className="bg-background">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
