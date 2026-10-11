import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { BareLayout, PublicLayout } from "@/components/layout/Layout";
import { homepagePronta, useEventi } from "@/lib/api";
import { useStore } from "@/lib/store";

const HomePage = lazy(() => import("@/pages/home/HomePage"));
const PrivacyPage = lazy(() => import("@/pages/privacy/PrivacyPage"));
const AccediPage = lazy(() => import("@/pages/accedi/AccediPage"));
const AreaApp = lazy(() => import("@/pages/area/AreaApp"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/** /eventi → sezione eventi della home; compatibilità con i vecchi link /eventi?id=21 */
function EventiRedirect() {
  const [q] = useSearchParams();
  const id = q.get("id");
  const eventi = useEventi();
  const pronta = useStore(homepagePronta);
  const e = id ? eventi.find((x) => String(x.id) === id) : null;
  // si aspettano i dati del server prima di decidere (un evento appena creato non è ancora nella copia salvata)
  if (id && !e && !pronta) return null;
  return <Navigate to={e ? `/eventi/${e.slug}` : "/#eventi"} replace />;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="eventi/:slug" element={<HomePage />} />
            <Route path="eventi" element={<EventiRedirect />} />
            {/* le vecchie pagine sono sezioni della home */}
            <Route path="aula" element={<Navigate to="/#aula" replace />} />
            <Route path="orari" element={<Navigate to="/#orari" replace />} />
            <Route path="associazione" element={<Navigate to="/#chi-siamo" replace />} />
            <Route path="associati" element={<Navigate to="/" replace />} />
            <Route path="statuto" element={<Navigate to="/#statuto" replace />} />
            <Route path="segnalazioni" element={<Navigate to="/#segnalazioni" replace />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="informativaPrivacy" element={<Navigate to="/privacy" replace />} />
            <Route path="accedi" element={<AccediPage />} />
            <Route path="login" element={<Navigate to="/accedi" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route element={<BareLayout />}>
            <Route path="area/*" element={<AreaApp />} />
            <Route path="dashboard" element={<Navigate to="/area" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  );
}
