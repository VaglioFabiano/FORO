import React, { useState, useRef, useEffect, useCallback } from "react";

// --- STILI AGGIUNTI PER LA CHAT ---
const styles: { [key: string]: React.CSSProperties } = {
  // Stili esistenti
  container: {
    padding: "2rem",
    textAlign: "center",
    backgroundColor: "#f4f4f4",
    borderRadius: "8px",
    border: "1px dashed #ccc",
    maxWidth: "700px",
    margin: "0 auto",
  },
  videoFeed: {
    width: "100%",
    maxHeight: "400px",
    backgroundColor: "#000",
    borderRadius: "8px",
    marginTop: "1rem",
    border: "1px solid #ccc",
  },
  buttonGroup: {
    marginTop: "1rem",
  },
  button: {
    backgroundColor: "#007bff",
    color: "white",
    padding: "10px 15px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    margin: "0.5rem",
  },
  clearButton: {
    backgroundColor: "#dc3545",
  },
  error: {
    color: "red",
    marginTop: "1rem",
  },
  paletteContainer: {
    marginTop: "1.5rem",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "1rem",
  },
  colorSampleItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem",
    border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#fff",
    position: "relative",
  },
  colorBox: {
    width: "80px",
    height: "80px",
    borderRadius: "8px",
    border: "2px solid #333",
  },
  removeButton: {
    position: "absolute",
    top: "5px",
    right: "5px",
    backgroundColor: "rgba(255, 0, 0, 0.7)",
    color: "white",
    border: "none",
    borderRadius: "50%",
    width: "20px",
    height: "20px",
    cursor: "pointer",
    lineHeight: "20px",
    padding: 0,
    fontSize: "14px",
  },
  canvas: {
    display: "none",
  },

  // --- NUOVI STILI PER LA CHAT ---
  chatContainer: {
    borderTop: "2px solid #ccc",
    marginTop: "2rem",
    paddingTop: "1rem",
  },
  chatHistory: {
    height: "300px",
    overflowY: "auto",
    border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#fff",
    padding: "1rem",
    textAlign: "left",
    marginBottom: "1rem",
  },
  chatMessage: {
    marginBottom: "0.75rem",
    padding: "0.5rem 0.75rem",
    borderRadius: "8px",
    lineHeight: "1.5",
    whiteSpace: "pre-wrap", // Mantiene la formattazione
  },
  userMessage: {
    backgroundColor: "#e1f5fe",
    textAlign: "right",
    marginLeft: "20%",
  },
  assistantMessage: {
    backgroundColor: "#f1f1f1",
    marginRight: "20%",
  },
  chatForm: {
    display: "flex",
    gap: "0.5rem",
  },
  chatInput: {
    flex: 1,
    padding: "12px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  chatSubmit: {
    backgroundColor: "#28a745", // Verde
    color: "white",
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
  },
};

// Interfacce per i colori e i messaggi
interface SampledColor {
  id: string;
  r: number;
  g: number;
  b: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Funzione helper (già presente, ma la lascio per completezza)
const rgbToHex = (r: number, g: number, b: number) => {
  return (
    "#" +
    ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
  );
};

const AiutoAbbinamenti: React.FC = () => {
  // Stati esistenti
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sampledColorsList, setSampledColorsList] = useState<SampledColor[]>(
    []
  );

  // --- NUOVI STATI PER LA CHAT ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const chatHistoryRef = useRef<HTMLDivElement>(null); // Per lo scroll automatico

  // Ref esistenti
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Funzioni esistenti (startCamera, stopCamera, sampleColor, etc...)
  const startCamera = useCallback(async () => {
    setError(null);
    setSampledColorsList([]);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Il tuo browser non supporta l'accesso alla videocamera."
        );
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
    } catch (err) {
      console.error("Errore nell'accesso alla videocamera:", err);
      if (err instanceof Error) {
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setError(
            "Accesso alla videocamera negato. Controlla i permessi del browser."
          );
        } else {
          setError(`Errore: ${err.message}`);
        }
      } else {
        setError("Errore sconosciuto nell'aprire la videocamera.");
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  const sampleColor = () => {
    if (!videoRef.current || !canvasRef.current || !stream) {
      setError("Videocamera non attiva o elementi non pronti.");
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Impossibile ottenere il contesto 2D del canvas.");
      return;
    }
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const centerX = Math.floor(canvas.width / 2);
      const centerY = Math.floor(canvas.height / 2);
      const imageData = context.getImageData(centerX, centerY, 1, 1).data;
      const newColor: SampledColor = {
        id: new Date().toISOString(),
        r: imageData[0],
        g: imageData[1],
        b: imageData[2],
      };
      setSampledColorsList((prevList) => [...prevList, newColor]);
      setError(null);
    } else {
      setError(
        "Il video non è pronto per il campionamento. Attendi o riprova."
      );
    }
  };

  const removeColor = (idToRemove: string) => {
    setSampledColorsList((prevList) =>
      prevList.filter((color) => color.id !== idToRemove)
    );
  };

  const clearAllColors = () => {
    setSampledColorsList([]);
  };

  // --- FUNZIONE DI INVIO CHAT  ---
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = currentMessage.trim();

    if (isChatLoading || !prompt) return;

    setCurrentMessage("");
    setIsChatLoading(true);

    const userMessage: ChatMessage = { role: "user", content: prompt };
    const newChatHistory = [...chatMessages, userMessage];
    setChatMessages(newChatHistory);

    try {
      // --- MODIFICA 1: Chiama /api/user ---
      const response = await fetch("/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // --- MODIFICA 2: Aggiungi 'action' e tutti i dati ---
        body: JSON.stringify({
          action: "chatStilista", // Questo dice al backend cosa fare
          history: chatMessages,
          userPrompt: prompt,
          colors: sampledColorsList,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Qualcosa è andato storto");
      }

      const aiContent = data.choices?.[0]?.message?.content;
      if (aiContent) {
        const aiMessage: ChatMessage = {
          role: "assistant",
          content: aiContent,
        };
        setChatMessages([...newChatHistory, aiMessage]);
      } else {
        throw new Error("Risposta AI non valida.");
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Errore sconosciuto";
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `Errore: ${errorMsg}`,
      };
      setChatMessages([...newChatHistory, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Hook per la pulizia
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Hook per scrollare la chat in fondo
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return (
    <div style={styles.container}>
      <h2>Aiuto Abbinamenti 📸</h2>

      {/* Sezione Videocamera */}
      <div style={styles.buttonGroup}>
        {!stream ? (
          <button style={styles.button} onClick={startCamera}>
            Apri Fotocamera
          </button>
        ) : (
          <>
            <button style={styles.button} onClick={stopCamera}>
              Chiudi Fotocamera
            </button>
            <button style={styles.button} onClick={sampleColor}>
              + Aggiungi Colore
            </button>
          </>
        )}
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ ...styles.videoFeed, display: stream ? "block" : "none" }}
      />
      <canvas ref={canvasRef} style={styles.canvas} />

      {/* Sezione Palette Colori */}
      {sampledColorsList.length > 0 && (
        <>
          <h3>Palette Colori Campionati</h3>
          <div style={styles.paletteContainer}>
            {sampledColorsList.map((color) => (
              <div key={color.id} style={styles.colorSampleItem}>
                <div
                  style={{
                    ...styles.colorBox,
                    backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                  }}
                ></div>
                <small>HEX: {rgbToHex(color.r, color.g, color.b)}</small>
                <button
                  style={styles.removeButton}
                  onClick={() => removeColor(color.id)}
                  title="Rimuovi questo colore"
                >
                  X
                </button>
              </div>
            ))}
          </div>
          <button
            style={{
              ...styles.button,
              ...styles.clearButton,
              marginTop: "1.5rem",
            }}
            onClick={clearAllColors}
          >
            Svuota Lista Colori
          </button>
        </>
      )}

      {/* --- NUOVA SEZIONE CHAT --- */}
      <div style={styles.chatContainer}>
        <h3>Consulente di Stile 🤖</h3>
        <p>Chiedi un consiglio su come abbinare i colori che hai scelto.</p>

        <div ref={chatHistoryRef} style={styles.chatHistory}>
          {chatMessages.length === 0 ? (
            <p style={{ color: "#888", textAlign: "center" }}>
              Inizia la conversazione...
              {sampledColorsList.length > 0 &&
                " I colori campionati verranno inviati con il tuo primo messaggio."}
            </p>
          ) : (
            chatMessages.map((msg, index) => (
              <div
                key={index}
                style={{
                  ...styles.chatMessage,
                  ...(msg.role === "user"
                    ? styles.userMessage
                    : styles.assistantMessage),
                }}
              >
                {msg.content}
              </div>
            ))
          )}
          {isChatLoading && (
            <div
              style={{
                ...styles.chatMessage,
                ...styles.assistantMessage,
                color: "#555",
              }}
            >
              Lo stilista sta pensando...
            </div>
          )}
        </div>

        <form style={styles.chatForm} onSubmit={handleChatSubmit}>
          <input
            type="text"
            style={styles.chatInput}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="Scrivi qui il tuo messaggio..."
            disabled={isChatLoading}
          />
          <button
            type="submit"
            style={styles.chatSubmit}
            disabled={isChatLoading || !currentMessage.trim()}
          >
            Invia
          </button>
        </form>
      </div>
    </div>
  );
};

export default AiutoAbbinamenti;
