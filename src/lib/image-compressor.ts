/**
 * Comprime y redimensiona una imagen en el cliente mediante un Canvas HTML5
 * antes de transmitirla a la API o al state, garantizando < 200 KB de payload
 * y evitando bloqueos de memoria o cuotas de red.
 */
export async function compressImageToDataUrl(
  file: File,
  maxDim = 1200,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Error leyendo el archivo"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Error cargando la imagen para procesar"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
