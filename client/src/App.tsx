import Header from './components/Header.tsx'
import OrariSection from './components/OrariSection.tsx'
import SocialSection from './components/SocialSection.tsx'
import StatutoSection from './components/StatutoSection.tsx'
import Footer from './components/Footer.tsx'

function App(): JSX.Element {
  return (
    <div className="min-h-screen">
      <Header />
      <OrariSection />
      <SocialSection />
      <StatutoSection />
      <Footer />
    </div>
  )
}

export default App