/**
 * Gestor de Persistencia de Imágenes en IndexedDB (Navegador).
 * Permite almacenar imágenes fotorrealistas en alta resolución (base64)
 * sin las restricciones de cuota de 5MB de localStorage ni el límite de 1MB de Firestore.
 */

export interface StoredGeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
  sourceType?: string;
  warning?: string;
  aspectRatio?: string;
  timestamp?: number;
}

const DB_NAME = "EcomShopImageStudioDB";
const STORE_NAME = "generated_images";
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB no disponible en este entorno"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Error abriendo IndexedDB"));
  });
}

/**
 * Guarda o actualiza una imagen en IndexedDB
 */
export async function saveImageToIndexedDB(image: StoredGeneratedImage): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const record = {
        ...image,
        timestamp: image.timestamp || Date.now()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] No se pudo guardar imagen:", err);
  }
}

/**
 * Guarda un array de imágenes en bloque
 */
export async function saveImagesBulkToIndexedDB(images: StoredGeneratedImage[]): Promise<void> {
  if (!images || images.length === 0) return;
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      for (const img of images) {
        store.put({
          ...img,
          timestamp: img.timestamp || Date.now()
        });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] Error en guardado masivo:", err);
  }
}

/**
 * Recupera todas las imágenes guardadas en sesiones anteriores ordenadas por fecha reciente
 */
export async function getAllImagesFromIndexedDB(): Promise<StoredGeneratedImage[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = (req.result as StoredGeneratedImage[]) || [];
        // Ordenar más recientes primero
        results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] Error al recuperar imágenes:", err);
    return [];
  }
}

/**
 * Elimina una imagen por su ID
 */
export async function deleteImageFromIndexedDB(id: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] Error al eliminar imagen:", err);
    return false;
  }
}

/**
 * Elimina todas las imágenes de sesiones anteriores
 */
export async function clearAllImagesFromIndexedDB(): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] Error al vaciar imágenes:", err);
    return false;
  }
}
