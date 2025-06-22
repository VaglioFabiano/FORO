import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.tsx';
import Header from './components/Header.tsx';
import OrariSection from './components/OrariSection.tsx';
import SocialSection from './components/SocialSection.tsx';
import StatutoSection from './components/StatutoSection.tsx';
import Footer from './components/Footer.tsx';
import Login from './components/Login.tsx';

// Componente per la pagina principale
const HomePage = () => {
  return (
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
  );
};

function App(): JSX.Element {
  return (
    <Router>
      <div className="min-h-screen">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;