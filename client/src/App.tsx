import { useState } from 'react';
import Navbar from './components/Navbar.tsx';
import Header from './components/Header.tsx';
import OrariSection from './components/OrariSection.tsx';
import SocialSection from './components/SocialSection.tsx';
import StatutoSection from './components/StatutoSection.tsx';
import Footer from './components/Footer.tsx';
import Login from './components/Login.tsx';

function App(): JSX.Element {
  const [showLogin, setShowLogin] = useState(false);

  const handleShowLogin = () => {
    setShowLogin(true);
  };

  const handleBackToHome = () => {
    setShowLogin(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar onLoginClick={handleShowLogin} />
      
      {showLogin ? (
        <div>
          <button 
            onClick={handleBackToHome}
            style={{
              position: 'absolute',
              top: '80px',
              left: '20px',
              padding: '10px 20px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            ← Torna alla Home
          </button>
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
