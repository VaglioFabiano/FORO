import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Header from "./components/Header";
import OrariSection from "./components/OrariSection";
import SocialSection from "./components/SocialSection";
import StatutoSection from "./components/StatutoSection";
import Footer from "./components/Footer";
import Login from "./components/Login";
import SegnalazioniSection from "./components/Segnalazioni";
import AssociatiSection from "./components/Associati";
import HomeDash from "./dashboard/homedash";
import BannerCookie from "./components/banner_cookie";
import PrenotaEventoPage from "./components/PrenotaEventoPage";
import HeaderEvento from "./components/HeaderEvento";

// Estensione dei tipi per includere la pagina eventi
type PageType = "home" | "login" | "dashboard" | "eventi";

interface RouteState {
  page: PageType;
  eventoId?: number;
}

function App() {
  const [currentRoute, setCurrentRoute] = useState<RouteState>({
    page: "home",
  });
  const [forceNavbarUpdate, setForceNavbarUpdate] = useState(false);
  const [, setCurrentUser] = useState<{
    id: number;
    level: number;
  } | null>(null);

  // Stato per l'evento che deve apparire nell'Header della Home
  const [eventoInEvidenza, setEventoInEvidenza] = useState<any>(null);

  // Funzione per parsare l'URL (Router custom)
  const parseUrl = (): RouteState => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (path === "/login") {
      return { page: "login" };
    }
    if (path === "/dashboard") {
      return { page: "dashboard" };
    }
    if (path === "/eventi") {
      return {
        page: "eventi",
        eventoId: id ? parseInt(id) : undefined,
      };
    }
    return { page: "home" };
  };

  // Recupera l'evento visibile per l'header all'avvio
  const fetchEventoVisibile = async () => {
    try {
      const response = await fetch("/api/eventi?section=visibile");
      const data = await response.json();
      if (data.success && data.evento) {
        setEventoInEvidenza(data.evento);
      }
    } catch (err) {
      console.error("Errore recupero evento visibile:", err);
    }
  };

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

  useEffect(() => {
    // Inizializzazione rotta e permessi
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
          checkUserPermissions();
          return;
        }
      } else {
        localStorage.clear();
      }
    }

    setCurrentRoute(parseUrl());
    checkUserPermissions();
    fetchEventoVisibile();
  }, []);

  // Gestione navigazione browser (avanti/indietro)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(parseUrl());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Funzione di navigazione interna
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
      case "eventi":
        newUrl = route.eventoId ? `/eventi?id=${route.eventoId}` : "/eventi";
        break;
      default:
        newUrl = "/";
        break;
    }
    window.history.pushState(null, "", newUrl);
  };

  // Handlers
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
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("rememberMe");
    navigateTo({ page: "home" });
    setForceNavbarUpdate((prev) => !prev);
    checkUserPermissions();
  };
  const handleGoToDashboard = () => navigateTo({ page: "dashboard" });

  // Espone la navigazione alla home globalmente (usata dai componenti figli)
  useEffect(() => {
    (window as any).navigateToHome = handleBackToHome;
    return () => {
      delete (window as any).navigateToHome;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar
        onLoginClick={handleShowLogin}
        onBackToHome={handleBackToHome}
        onLogout={handleLogout}
        isInLoginPage={currentRoute.page === "login"}
        forceLoginCheck={forceNavbarUpdate}
        isInDashboard={currentRoute.page === "dashboard"}
        onGoToDashboard={handleGoToDashboard}
      />

      {/* Renderizzazione condizionale delle pagine */}
      {currentRoute.page === "dashboard" ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HomeDash onLogout={handleLogout} onBackToHome={handleBackToHome} />
        </main>
      ) : currentRoute.page === "login" ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Login onLoginSuccess={handleLoginSuccess} />
        </main>
      ) : currentRoute.page === "eventi" ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <PrenotaEventoPage eventoId={currentRoute.eventoId} />
        </main>
      ) : (
        /* --- PAGINA HOME --- */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div id="header">
            {eventoInEvidenza ? (
              <HeaderEvento
                evento={eventoInEvidenza}
                onPrenotaClick={(id) =>
                  navigateTo({ page: "eventi", eventoId: id })
                }
              />
            ) : (
              <Header />
            )}
          </div>

          <div id="orari">
            <OrariSection />
          </div>

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
        </main>
      )}

      <BannerCookie />
    </div>
  );
}

export default App;
