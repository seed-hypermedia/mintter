import Footer from '../footer'
import {SiteHead} from '../site-head'

export default function DownloadPage() {
  return (
    <>
      <SiteHead />
      <main
        id="main-content"
        tabIndex={-1}
        className="main-content wrapper text-size-1"
      >
        <section className="flow">
          <h1>Download Mintter</h1>
          <div className="cluster">
            <a className="download-item">
							<span className='title'>MacOS (M1)</span>
							<span className='description'>41mb</span>
						</a>
            <a className="download-item">But stack where space is limited</a>
            <a className="download-item">Aenean Commodo Vestibulum</a>
            <a className="download-item">Ornare Lorem Pharetra</a>
            <a className="download-item">Fusce dapibus, tellus ac cursus commodo</a>
            <a className="download-item">Ipsum Etiam Tristique Quam</a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
