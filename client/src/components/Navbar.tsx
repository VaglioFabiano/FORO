import React, { useState, useEffect } from "react";
import "../style/navbar.css";

interface NavbarProps {
  onLoginClick: () => void;
  onBackToHome: () => void;
  onLogout: () => void;
  isInLoginPage: boolean;
  forceLoginCheck?: boolean;
  isInDashboard?: boolean;
  onGoToDashboard?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  onLoginClick,
  onBackToHome,
  onLogout,
  isInLoginPage,
  forceLoginCheck,
  isInDashboard = false,
  onGoToDashboard,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const threshold = window.innerHeight * 0.1;
      setIsScrolled(scrollTop > threshold);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const checkLoginStatus = () => {
    const user = localStorage.getItem("user");
    const loginTime = localStorage.getItem("loginTime");
    const rememberMe = localStorage.getItem("rememberMe") === "true";

    if (user && loginTime) {
      const now = new Date().getTime();
      const loginTimestamp = parseInt(loginTime);
      const expirationTime = rememberMe
        ? 30 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

      if (now - loginTimestamp < expirationTime) {
        setIsLoggedIn(true);
      } else {
        localStorage.clear();
        setIsLoggedIn(false);
      }
    } else {
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
    const interval = setInterval(checkLoginStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (forceLoginCheck) {
      checkLoginStatus();
    }
  }, [forceLoginCheck]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const sessionToken = localStorage.getItem("sessionToken");

      // Chiama l'API di logout
      const response = await fetch("/api/autenticazione", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionToken,
          action: "logout",
        }),
      });

      const data = await response.json();
      console.log("Logout response:", data);

      // Pulisci il localStorage indipendentemente dalla risposta dell'API
      localStorage.removeItem("user");
      localStorage.removeItem("loginTime");
      localStorage.removeItem("sessionToken");
      localStorage.removeItem("rememberMe");
      setIsLoggedIn(false);
      onLogout();

      // Reindirizza alla homepage e ricarica la pagina
      window.location.href = "/";
    } catch (error) {
      console.error("Errore durante il logout:", error);
      // Anche in caso di errore, pulisci il localStorage
      localStorage.clear();
      setIsLoggedIn(false);
      onLogout();

      // Reindirizza alla homepage anche in caso di errore
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNavigation = (sectionId?: string) => {
    setIsMobileMenuOpen(false);

    if (isInDashboard || isInLoginPage) {
      onBackToHome();

      if (sectionId) {
        setTimeout(() => {
          const element = document.getElementById(sectionId);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }, 300);
      }
    } else if (sectionId) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.href = `/#${sectionId}`;
      }
    }
  };

  const handleAuthClick = () => {
    if (isLoggedIn) {
      handleLogout();
    } else {
      onLoginClick();
    }
    setIsMobileMenuOpen(false);
  };

  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ): void => {
    const target = e.target as HTMLImageElement;
    const nextSibling = target.nextElementSibling as HTMLElement;
    target.style.display = "none";
    if (nextSibling) {
      nextSibling.style.display = "flex";
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const getAuthButtonText = () => {
    if (isLoggingOut) return "Logout...";
    return isLoggedIn ? "Logout" : "Login";
  };

  // Render menu items based on login status only
  const renderMenuItems = () => {
    if (isLoggedIn) {
      return (
        <>
          <button
            className="nav-link"
            onClick={() => handleNavigation("header")}
          >
            Home Visitatori
          </button>
          {onGoToDashboard && (
            <button className="nav-link" onClick={onGoToDashboard}>
              Dashboard
            </button>
          )}
        </>
      );
    } else {
      return (
        <>
          <button
            className="nav-link"
            onClick={() => handleNavigation("header")}
          >
            Home
          </button>
          <button
            className="nav-link"
            onClick={() => handleNavigation("orari")}
          >
            Orari
          </button>
          <button
            className="nav-link"
            onClick={() => handleNavigation("social")}
          >
            Social
          </button>
          <button
            className="nav-link"
            onClick={() => handleNavigation("statuto")}
          >
            Statuto
          </button>
          <button
            className="nav-link"
            onClick={() => handleNavigation("associati")}
          >
            Diventa Socio
          </button>
          <button
            className="nav-link"
            onClick={() => handleNavigation("segnalazioni")}
          >
            Segnalazioni
          </button>
          <button
            className="nav-link"
            onClick={() => handleNavigation("footer")}
          >
            Contatti
          </button>
        </>
      );
    }
  };

  return (
    <>
      <nav className={`navbar ${isScrolled ? "navbar-scrolled" : ""}`}>
        <div className="navbar-container">
          <div
            className="navbar-logo"
            onClick={() => handleNavigation("header")}
            style={{ cursor: "pointer" }}
          >
            <img
              src="/assets/logo.png"
              alt="Logo Aula Studio"
              className="navbar-logo-image"
              onError={handleImageError}
            />
            <div className="navbar-logo-fallback">
              <span className="navbar-logo-text">AS</span>
            </div>
            <span className="navbar-brand">Associazione FORO</span>
          </div>

          <div className="navbar-nav">
            {renderMenuItems()}

            <button
              className="nav-link login-link"
              onClick={handleAuthClick}
              disabled={isLoggingOut}
            >
              {getAuthButtonText()}
            </button>
          </div>

          <div
            className={`mobile-menu-toggle ${isMobileMenuOpen ? "active" : ""}`}
            onClick={toggleMobileMenu}
          >
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </nav>

      <div
        className={`mobile-menu-overlay ${isMobileMenuOpen ? "active" : ""}`}
      >
        <div className="mobile-menu-content">
          {isLoggedIn ? (
            <>
              <button
                className="mobile-nav-link"
                onClick={() => handleNavigation("header")}
              >
                Home
              </button>
              {onGoToDashboard && (
                <button className="mobile-nav-link" onClick={onGoToDashboard}>
                  Dashboard
                </button>
              )}
            </>
          ) : (
            <>
              <button
                className="mobile-nav-link"
                onClick={() => handleNavigation("header")}
              >
                Home
              </button>
              <button
                className="mobile-nav-link"
                onClick={() => handleNavigation("orari")}
              >
                Orari
              </button>
              <button
                className="mobile-nav-link"
                onClick={() => handleNavigation("social")}
              >
                Social
              </button>
              <button
                className="mobile-nav-link"
                onClick={() => handleNavigation("statuto")}
              >
                Statuto
              </button>
              <button
                className="mobile-nav-link"
                onClick={() => handleNavigation("associati")}
              >
                Diventa Socio
              </button>
              <button
                className="mobile-nav-link"
                onClick={() => handleNavigation("segnalazioni")}
              >
                Segnalazioni
              </button>
              <button
                className="mobile-nav-link"
                onClick={() => handleNavigation("footer")}
              >
                Contatti
              </button>
            </>
          )}

          <button
            className="mobile-nav-link login-link"
            onClick={handleAuthClick}
            disabled={isLoggingOut}
          >
            {getAuthButtonText()}
          </button>
        </div>
      </div>
    </>
  );
};

export default Navbar;
