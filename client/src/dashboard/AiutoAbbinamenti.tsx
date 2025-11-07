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
    // transform: "scaleX(-1)", // <-- RIMOSSO! Non serve per la camera posteriore
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
};

interface SampledColor {
  id: string;
  r: number;
  g: number;
  b: number;
}

const rgbToHex = (r: number, g: number, b: number) => {
  return (
    "#" +
    ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
  );
};

const AiutoAbbinamenti: React.FC = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sampledColorsList, setSampledColorsList] = useState<SampledColor[]>(
    []
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
        // === MODIFICA CHIAVE ===
        // "environment" = fotocamera posteriore (su PC fa fallback alla webcam)
        video: { facingMode: "environment" },
        // =======================
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

      // === MODIFICA CHIAVE ===
      // Logica per "flippare" il canvas RIMOSSA
      // =======================
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

      {sampledColorsList.length > 0 && (
        <>
          <hr style={{ margin: "2rem 0" }} />
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
                <small>
                  RGB: ({color.r}, {color.g}, {color.b})
                </small>
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
            Svuota Lista
          </button>
        </>
      )}
    </div>
  );
};

export default AiutoAbbinamenti;
