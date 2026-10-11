/**
 * Tono dell'header: le pagine che iniziano con un fondo scuro (Petrolio/Notte)
 * chiamano useHeaderTone("dark") così l'header parte in Carta e diventa chiaro allo scroll.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Tone = "light" | "dark";
const Ctx = createContext<{ tone: Tone; setTone: (t: Tone) => void }>({ tone: "light", setTone: () => {} });

export function HeaderToneProvider({ children }: { children: ReactNode }) {
  const [tone, setTone] = useState<Tone>("light");
  return <Ctx.Provider value={{ tone, setTone }}>{children}</Ctx.Provider>;
}

export function useHeaderToneValue() {
  return useContext(Ctx).tone;
}

/** Da chiamare in cima a una pagina con hero scuro */
export function useHeaderTone(t: Tone) {
  const { setTone } = useContext(Ctx);
  useEffect(() => {
    setTone(t);
    return () => setTone("light");
  }, [t, setTone]);
}
