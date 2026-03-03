import { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
import Header from "./components/Header";
import HeaderEvento from "./components/HeaderEvento";
import OrariSection from "./components/OrariSection";
import SocialSection from "./components/SocialSection";
import StatutoSection from "./components/StatutoSection";
import AssociatiSection from "./components/Associati";
import SegnalazioniSection from "./components/Segnalazioni";
import Footer from "./components/Footer";
import Login from "./components/Login";
import HomeDash from "./dashboard/homedash";
import BannerCookie from "./components/banner_cookie";
import PrenotaEventoPage from "./components/PrenotaEventoPage";

type PageType = "home" | "login" | "dashboard" | "eventi";

interface RouteState {
  page: PageType;
  eventoId?: number;
}

// Spostato fuori per poterlo usare come stato iniziale immediato
const parseUrl = (): RouteState => {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (path === "/login") return { page: "login" };
  if (path === "/dashboard") return { page: "dashboard" };
  if (path === "/eventi") {
    return {
      page: "eventi",
      eventoId: id ? parseInt(id) : undefined,
    };
  }
  return { page: "home" };
};

function App() {
  // ORA INIZIALIZZA SUBITO L'URL CORRETTO
  const [currentRoute, setCurrentRoute] = useState<RouteState>(parseUrl());
  const [eventoInEvidenza, setEventoInEvidenza] = useState<any>(null);
  const [forceNavbarUpdate, setForceNavbarUpdate] = useState(false);
  const [, setCurrentUser] = useState<any>(null);

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

  const handleBackToHome = () => {
    navigateTo({ page: "home" });
    checkUserPermissions();
  };
  const handleShowLogin = () => navigateTo({ page: "login" });
  const handleGoToDashboard = () => navigateTo({ page: "dashboard" });

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

  const checkUserPermissions = useCallback(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (e) {
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
  }, []);

  const fetchEventoVisibile = async () => {
    try {
      const response = await fetch("/api/eventi?section=visibile");
      const data = await response.json();
      if (data.success && data.evento) setEventoInEvidenza(data.evento);
    } catch (err) {
      console.error("Errore recupero evento visibile:", err);
    }
  };

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

      if (now - loginTimestamp > expirationTime) localStorage.clear();
    }

    checkUserPermissions();
    fetchEventoVisibile();

    (window as any).navigateToHome = handleBackToHome;

    const handlePopState = () => setCurrentRoute(parseUrl());
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      delete (window as any).navigateToHome;
    };
  }, [checkUserPermissions]);

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

      <main>
        {currentRoute.page === "dashboard" ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <HomeDash onLogout={handleLogout} onBackToHome={handleBackToHome} />
          </div>
        ) : currentRoute.page === "login" ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Login onLoginSuccess={handleLoginSuccess} />
          </div>
        ) : currentRoute.page === "eventi" ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* IL PARAMETRO VIENE PASSATO QUI */}
            <PrenotaEventoPage eventoId={currentRoute.eventoId} />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
            <section id="header">
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
            </section>

            <div className="px-4 sm:px-0">
              <section id="orari">
                <OrariSection />
              </section>
              <section id="social">
                <SocialSection />
              </section>
              <section id="statuto">
                <StatutoSection />
              </section>
              <section id="associati">
                <AssociatiSection />
              </section>
              <section id="segnalazioni">
                <SegnalazioniSection />
              </section>
              <section id="footer">
                <Footer />
              </section>
            </div>
          </div>
        )}
      </main>
      <BannerCookie />
    </div>
  );
}

export default App;
