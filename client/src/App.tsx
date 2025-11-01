import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Header from "./components/Header";
import OrariSection from "./components/OrariSection";
// import EventiSection from './components/EventiSection';
import SocialSection from "./components/SocialSection";
import StatutoSection from "./components/StatutoSection";
import Footer from "./components/Footer";
import Login from "./components/Login";
import SegnalazioniSection from "./components/Segnalazioni";
import AssociatiSection from "./components/Associati";
import HomeDash from "./dashboard/homedash";
//import BannerCookie from "./components/banner_cookie";
// import MappeSection from './components/mappe';
// import PrenotaEventoPage from './components/PrenotaEventoPage';

// Tipo per le pagine dell'applicazione
type PageType = "home" | "login" | "dashboard"; // | 'prenota-evento';

// Interfaccia per lo stato del routing
interface RouteState {
  page: PageType;
  // eventoId?: number;
}

function App() {
  const [currentRoute, setCurrentRoute] = useState<RouteState>({
    page: "home",
  });
  const [forceNavbarUpdate, setForceNavbarUpdate] = useState(false);
  const [, /*currentUser,*/ setCurrentUser] = useState<{
    id: number;
    level: number;
  } | null>(null);

  // ... (tutte le funzioni parseUrl, checkUserPermissions, ecc. rimangono invariate) ...

  // Funzione per parsare l'URL e determinare la pagina corrente
  const parseUrl = (): RouteState => {
    const path = window.location.pathname;
    const hash = window.location.hash;

    if (hash && path === "/") {
      return { page: "home" };
    }
    if (path === "/login") {
      return { page: "login" };
    }
    if (path === "/dashboard") {
      return { page: "dashboard" };
    }
    return { page: "home" };
  };

  // Controlla i permessi utente
  const checkUserPermissions = () => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        setCurrentUser(userData);
      } catch (error) {
        console.error("Errore nel parsing user data:", error);
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
  };

  // Controlla lo stato di login all'avvio e imposta la rotta iniziale
  useEffect(() => {
    const user = localStorage.getItem("user");
    const loginTime = localStorage.getItem("loginTime");

    if (user && loginTime) {
      const now = new Date().getTime();
      const loginTimestamp = parseInt(loginTime);
      const rememberMe = localStorage.getItem("rememberMe") === "true";
      const expirationTime = rememberMe
        ? 30 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

      if (now - loginTimestamp < expirationTime) {
        const currentUrl = parseUrl();
        if (currentUrl.page === "dashboard") {
          setCurrentRoute({ page: "dashboard" });
          return;
        }
      } else {
        localStorage.clear();
      }
    }
    setCurrentRoute(parseUrl());
    checkUserPermissions();
  }, []);

  // Gestisci il pulsante indietro del browser
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(parseUrl());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Funzione per navigare alle diverse pagine
  const navigateTo = (route: RouteState) => {
    setCurrentRoute(route);
    let newUrl = "/";
    switch (route.page) {
      case "login":
        newUrl = "/login";
        break;
      case "dashboard":
        newUrl = "/dashboard";
        break;
      case "home":
      default:
        newUrl = "/";
        break;
    }
    window.history.pushState(null, "", newUrl);
  };

  const handleShowLogin = () => navigateTo({ page: "login" });

  const handleBackToHome = () => {
    navigateTo({ page: "home" });
    checkUserPermissions();
  };

  const handleLoginSuccess = () => {
    navigateTo({ page: "dashboard" });
    setForceNavbarUpdate((prev) => !prev);
    checkUserPermissions();
  };

  const handleLogout = () => {
    localStorage.clear();
    navigateTo({ page: "home" });
    setForceNavbarUpdate((prev) => !prev);
    checkUserPermissions();
  };

  const handleGoToDashboard = () => navigateTo({ page: "dashboard" });

  useEffect(() => {
    (window as any).navigateToHome = () => navigateTo({ page: "home" });
    return () => {
      delete (window as any).navigateToHome;
    };
  }, []);

  return (
    <div className="min-h-screen">
      {/* Navbar: è fuori dal <main> e si estende per tutta la larghezza */}
      <Navbar
        onLoginClick={handleShowLogin}
        onBackToHome={handleBackToHome}
        onLogout={handleLogout}
        isInLoginPage={currentRoute.page === "login"}
        forceLoginCheck={forceNavbarUpdate}
        isInDashboard={currentRoute.page === "dashboard"}
        onGoToDashboard={handleGoToDashboard}
      />

      {/* MODIFICA CHIAVE: 
        Spostiamo la logica di 'max-width' e 'margin: auto' qui dentro.
      */}

      {currentRoute.page === "dashboard" ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HomeDash onLogout={handleLogout} onBackToHome={handleBackToHome} />
        </main>
      ) : currentRoute.page === "login" ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Login onLoginSuccess={handleLoginSuccess} />
        </main>
      ) : (
        // Pagina Home
        <>
          {/* Il contenuto della home è avvolto dal main */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div id="header">
              <Header />
            </div>
            <div id="orari">
              <OrariSection />
            </div>
            {/* {canSeeEventi() && (
              <div id="eventi">
                <EventiSection />
              </div>
            )} */}
            <div id="social">
              <SocialSection />
            </div>
            <div id="statuto">
              <StatutoSection />
            </div>
            <div id="associati">
              <AssociatiSection />
            </div>
            <div id="segnalazioni">
              <SegnalazioniSection />
            </div>
            <div id="footer">
              <Footer />
            </div>
            {/*
            <div id="mappe">
              <MappeSection />
            </div>*/}
          </main>
        </>
      )}
    </div>
  );
}

export default App;
