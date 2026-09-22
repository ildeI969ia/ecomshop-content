import { useState, useCallback } from "react";

export function useImageDownloader() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const downloadImage = useCallback(async (url: string, id: string) => {
    try {
      setDownloadingId(id);

      // Si es base64 (data:image/...)
      if (url.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `ecomshop-imagen-${id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // Si es una URL remota, intentamos fetch como blob para forzar la descarga sin abrir pestaña
      try {
        const response = await fetch(url, { mode: "cors" });
        if (!response.ok) throw new Error("HTTP error " + response.status);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `ecomshop-imagen-${id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      } catch {
        // Fallback si CORS bloquea el fetch directo
        const a = document.createElement("a");
        a.href = url;
        a.download = `ecomshop-imagen-${id}.jpg`;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } finally {
      setTimeout(() => setDownloadingId(null), 800);
    }
  }, []);

  return {
    downloadingId,
    downloadImage
  };
}
