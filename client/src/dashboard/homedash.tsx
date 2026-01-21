import React, { useState, useEffect } from "react";
import CreaUtenti from "./CreaUtenti";
import ModificaOrari from "./ModificaOrari";
import TelegramSender from "./TelegramSender";
import NotificheTelegram from "./NotificheTelegram";
import VisualizzaUtenti from "./VisualizzaUtenti";
import ProfiloUtente from "./ProfiloUtente";
import Turni from "./Turni";
import Presenze from "./presenze";
import GestisciEventi from "./GestisciEventi";
import GestioneTurno from "./GestioneTurno";
import AiutoAbbinamenti from "./AiutoAbbinamenti";
import "../style/homeDash.css";

import { FaTelegram } from "react-icons/fa";
import {
  FcCalendar,
  FcTodoList,
  FcClock,
  FcInvite,
  FcConferenceCall,
  FcPlanner,
  FcLandscape,
  FcHome,
  FcHighPriority,
  FcReading,
} from "react-icons/fc";

interface HomeDashProps {
  onLogout: () => void;
  onBackToHome: () => void;
}

interface DashboardItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component?: React.ComponentType<any>;
  minLevel?: number;
  isHomepageLink?: boolean;
}

const HomeDash: React.FC<HomeDashProps> = ({ onLogout, onBackToHome }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(
    null,
  );
  const [userLevel, setUserLevel] = useState<number>(-1);

  const iconSize = 35;

  const dashboardItems: DashboardItem[] = [
    {
      id: "turni",
      title: "Turni Aula Studio",
      description: "Form di gestione turni",
      icon: <FcCalendar size={iconSize} />,
      component: Turni,
      minLevel: 4,
    },
    {
      id: "presenze",
      title: "Presenze Aula Studio",
      description: "Form di gestione delle presenze",
      icon: <FcTodoList size={iconSize} />,
      component: Presenze,
      minLevel: 4,
    },
    {
      id: "modifica-orari",
      title: "Modifica Orari",
      description: "Gestisci gli orari di apertura",
      icon: <FcClock size={iconSize} />,
      component: ModificaOrari,
      minLevel: 2,
    },
    {
      id: "crea-utenti",
      title: "Crea Utenti",
      description: "Gestisci e crea nuovi utenti",
      icon: <FcInvite size={iconSize} />,
      component: CreaUtenti,
      minLevel: 1,
    },
    {
      id: "visualizza-utenti",
      title: "Visualizza Utenti",
      description: "Visualizza tutti gli utenti registrati",
      icon: <FcConferenceCall size={iconSize} />,
      component: VisualizzaUtenti,
      minLevel: 1,
    },
    {
      id: "gestisci-eventi",
      title: "Gestisci Eventi",
      description: "Crea e gestisci eventi e prenotazioni",
      icon: <FcPlanner size={iconSize} />,
      component: GestisciEventi,
      minLevel: 2,
    },
    {
      id: "aiuto-abbinamenti",
      title: "Aiuto Heidis",
      description: "Strumento per abbinare i colori per i daltonici",
      icon: <FcLandscape size={iconSize} />,
      component: AiutoAbbinamenti,
      minLevel: 2,
    },
    {
      id: "telegram-debug",
      title: "Debug Telegram",
      description: "Per i chat ID Telegram livello 0",
      icon: <FaTelegram size={iconSize} color="#0088cc" />,
      component: TelegramSender,
      minLevel: 0,
    },
    {
      id: "notifiche-telegram",
      title: "Notifiche Telegram",
      description: "Gestisci le tue classi di notifica",
      icon: <FaTelegram size={iconSize} color="#0088cc" />,
      component: NotificheTelegram,
      minLevel: 2,
    },
    {
      id: "homepage",
      title: "Modifica Homepage",
      description: "Modifica la homepage del sito",
      icon: <FcHome size={iconSize} />,
      minLevel: 2,
      isHomepageLink: true,
    },
    {
      id: "gestione-turno",
      title: "Gestione Turno",
      description: "Gestisci i turni degli utenti",
      icon: <FcHighPriority size={iconSize} />,
      component: GestioneTurno,
      minLevel: 4,
    },
    {
      id: "profilo-utente",
      title: "Il Mio Profilo",
      description: "Modifica le tue informazioni personali",
      icon: <FcReading size={iconSize} />,
      component: ProfiloUtente,
      minLevel: 4,
    },
  ];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = localStorage.getItem("user");
        const loginTime = localStorage.getItem("loginTime");
        const rememberMe = localStorage.getItem("rememberMe") === "true";
        if (!user || !loginTime) {
          throw new Error("Dati di autenticazione mancanti");
        }

        const now = new Date().getTime();
        const loginTimestamp = parseInt(loginTime);
        const expirationTime = rememberMe
          ? 30 * 24 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;
        if (now - loginTimestamp > expirationTime) {
          throw new Error("Sessione scaduta");
        }

        const userData = JSON.parse(user);
        if (userData.level === undefined && userData.level !== 0) {
          throw new Error("Livello utente non valido");
        }

        setUserLevel(userData.level);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Errore autenticazione:", error);
        localStorage.clear();
        setIsAuthenticated(false);
        onLogout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [onLogout]);

  const visibleItems = dashboardItems.filter(
    (item) => item.minLevel === undefined || userLevel <= item.minLevel,
  );

  const handleCardClick = (item: DashboardItem) => {
    if (item.isHomepageLink) {
      onBackToHome();
      setTimeout(() => {
        const element = document.getElementById("header");
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 300);
      return;
    }
    if (item.component) {
      setSelectedComponent(item.id);
    }
  };

  const handleBackToDashboard = () => {
    setSelectedComponent(null);
  };

  const getSelectedComponent = () => {
    const item = dashboardItems.find((item) => item.id === selectedComponent);
    return item?.component || null;
  };

  if (isLoading) {
    return (
      <div className="homedashcss_loading-container">
        <div className="homedashcss_loading-spinner"></div>
        <p>Caricamento...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (selectedComponent) {
    const SelectedComponent = getSelectedComponent();
    if (!SelectedComponent) {
      setSelectedComponent(null);
      return null;
    }

    return (
      <div className="homedashcss_dashboard-container">
        <div className="homedashcss_dashboard-header">
          <button
            className="homedashcss_back-button"
            onClick={handleBackToDashboard}
          >
            ← Torna alla Dashboard
          </button>
        </div>
        <div className="homedashcss_component-container">
          <SelectedComponent />
        </div>
      </div>
    );
  }

  return (
    <div className="homedashcss_dashboard-container">
      <div className="homedashcss_dashboard-grid">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <div
              key={item.id}
              className="homedashcss_dashboard-card"
              onClick={() => handleCardClick(item)}
              style={{ cursor: "pointer" }}
            >
              <div className="homedashcss_card-icon">{item.icon}</div>
              <h3 className="homedashcss_card-title">{item.title}</h3>
              <p className="homedashcss_card-description">{item.description}</p>
            </div>
          ))
        ) : (
          <div className="homedashcss_no-access">
            <h2>Nessun accesso</h2>
            <p>
              Il tuo livello ({userLevel}) non ti permette di vedere alcun
              elemento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeDash;
