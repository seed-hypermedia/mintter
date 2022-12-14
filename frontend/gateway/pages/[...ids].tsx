export default function PublicationPage(props) {

	return (
		<div><h1>Publication here</h1><div>{JSON.stringify(props)}</div></div>
	)
}

export async function getStaticProps({ params }) {
  // const { tweet } = params

  // if (tweet.length > 40 || !TWEET_ID.test(tweet)) {
  //   return { notFound: true }
  // }

  // try {
  //   const ast = await fetchTweetAst(tweet)
  //   return ast ? { props: { ast } } : { notFound: true }
  // } catch (error) {
  //   // The Twitter API most likely died
  //   console.error(error)
  //   return { notFound: true }
  // }

	return {
		props: params
	}
}

export async function getStaticPaths() {
	return { paths: [], fallback: true}
}