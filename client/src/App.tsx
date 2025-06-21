import Navbar from './components/Navbar.tsx';
import Header from './components/Header.tsx';
import OrariSection from './components/OrariSection.tsx';
import SocialSection from './components/SocialSection.tsx';
import StatutoSection from './components/StatutoSection.tsx';
import Footer from './components/Footer.tsx';

function App(): JSX.Element {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Header />
      <div id="orari">
        <OrariSection />
      </div>
      <div id="social">
        <SocialSection />
      </div>
      <div id="statuto">
        <StatutoSection />
      </div>
      <div id="footer">
        <Footer />
      </div>
    </div>
  );
}

export default App;