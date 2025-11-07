import React, { useState, useRef, useEffect, useCallback } from "react";

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: "2rem",
    textAlign: "center",
    backgroundColor: "#f4f4f4",
    borderRadius: "8px",
    border: "1px dashed #ccc",
    maxWidth: "600px",
    margin: "0 auto",
  },
  videoFeed: {
    width: "100%",
    maxHeight: "400px",
    backgroundColor: "#000",
    borderRadius: "8px",
    marginTop: "1rem",
    border: "1px solid #ccc",
    transform: "scaleX(-1)", // Effetto specchio per selfie-cam (rimetti "environment" se usi la posteriore)
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
    backgroundColor: "#dc3545", // Un rosso per "cancella"
  },
  error: {
    color: "red",
    marginTop: "1rem",
  },
  // Contenitore per la LISTA di colori
  paletteContainer: {
    marginTop: "1.5rem",
    display: "flex",
    flexWrap: "wrap", // Va a capo se i colori sono troppi
    justifyContent: "center",
    gap: "1rem",
  },
  // Contenitore per il SINGOLO colore campionato
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
};

// Interfaccia per il colore, ora con un ID unico
interface SampledColor {
  id: string;
  r: number;
  g: number;
  b: number;
}

// Funzione helper per convertire RGB in HEX
const rgbToHex = (r: number, g: number, b: number) => {
  return (
    "#" +
    ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
  );
};

const AiutoAbbinamenti: React.FC = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  // STATO MODIFICATO: da un singolo colore a una LISTA (array) di colori
  const [sampledColorsList, setSampledColorsList] = useState<SampledColor[]>(
    []
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Chiede l'accesso alla fotocamera
   */
  const startCamera = useCallback(async () => {
    setError(null);
    setSampledColorsList([]); // Resetta la LISTA all'avvio
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Il tuo browser non supporta l'accesso alla videocamera."
        );
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        // Rimesso "user" (selfie) per l'effetto specchio, cambia a "environment" per la posteriore
        video: { facingMode: "user" },
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

  /**
   * Ferma lo stream video
   */
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      // Non resettiamo la lista quando si chiude la camera,
      // l'utente potrebbe volerla tenere. Resettiamo solo all'avvio.
    }
  }, [stream]);

  /**
   * Campiona un colore e lo AGGIUNGE alla lista
   */
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

      // Disegna il frame
      // NB: Se usi la selfie-cam con l'effetto specchio (scaleX(-1)),
      // devi "flippare" anche il canvas per campionare il punto giusto!
      if (styles.videoFeed.transform === "scaleX(-1)") {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Campiona il pixel al centro
      const centerX = Math.floor(canvas.width / 2);
      const centerY = Math.floor(canvas.height / 2);
      const imageData = context.getImageData(centerX, centerY, 1, 1).data;

      const newColor: SampledColor = {
        id: new Date().toISOString(), // Un ID unico basato sul timestamp
        r: imageData[0],
        g: imageData[1],
        b: imageData[2],
      };

      // Aggiunge il nuovo colore alla lista esistente
      setSampledColorsList((prevList) => [...prevList, newColor]);
      setError(null);
    } else {
      setError(
        "Il video non è pronto per il campionamento. Attendi o riprova."
      );
    }
  };

  /**
   * Rimuove un colore dalla lista usando il suo ID
   */
  const removeColor = (idToRemove: string) => {
    setSampledColorsList((prevList) =>
      prevList.filter((color) => color.id !== idToRemove)
    );
  };

  /**
   * Svuota l'intera lista di colori
   */
  const clearAllColors = () => {
    setSampledColorsList([]);
  };

  // Hook per la pulizia
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div style={styles.container}>
      <h2>Aiuto Abbinamenti 📸</h2>

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

      {/* Sezione per mostrare la PALETTE di colori */}
      {sampledColorsList.length > 0 && (
        <>
          <hr style={{ margin: "2rem 0" }} />
          <h3>Palette Colori Campionati</h3>
          <div style={styles.paletteContainer}>
            {/* Iteriamo sulla lista e mostriamo ogni colore */}
            {sampledColorsList.map((color) => (
              <div key={color.id} style={styles.colorSampleItem}>
                <div
                  style={{
                    ...styles.colorBox,
                    backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                  }}
                ></div>
                <small>
                  RGB: ({color.r}, {color.g}, {color.b})
                </small>
                <small>HEX: {rgbToHex(color.r, color.g, color.b)}</small>
                {/* Bottone per rimuovere il SINGOLO colore */}
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
          {/* Bottone per svuotare l'intera lista */}
          <button
            style={{
              ...styles.button,
              ...styles.clearButton,
              marginTop: "1.5rem",
            }}
            onClick={clearAllColors}
          >
            Svuota Lista
          </button>
        </>
      )}
    </div>
  );
};

export default AiutoAbbinamenti;
