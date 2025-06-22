import { useState, useEffect} from 'react';
import Navbar from './components/Navbar.tsx';
import Header from './components/Header.tsx';
import OrariSection from './components/OrariSection.tsx';
import SocialSection from './components/SocialSection.tsx';
import StatutoSection from './components/StatutoSection.tsx';
import Footer from './components/Footer.tsx';
import Login from './components/Login.tsx';

function App(): JSX.Element {
  const [showLogin, setShowLogin] = useState(false);

useEffect(() => {
  const hash = window.location.hash;
  if (hash) {
    const id = hash.replace('#', '');
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }
}, []);

  const handleShowLogin = () => {
    setShowLogin(true);
  };

  return (
    <div className="min-h-screen">
      <Navbar onLoginClick={handleShowLogin} />
      
      {showLogin ? (
        <div>
          
          <Login />
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

export default App;
