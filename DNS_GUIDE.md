# Guía de Configuración DNS: marketing.ecomspain.com

Para que tu equipo acceda a través del dominio corporativo **`https://marketing.ecomspain.com`**, sigue estos pasos con **Firebase Hosting**:

---

## 🚀 Paso 1: Conectar el Dominio en la Consola de Firebase

1. Abre la [Consola de Firebase](https://console.firebase.google.com/) y selecciona tu proyecto.
2. En el menú lateral izquierdo, ve a **Compilación > Hosting**.
3. Haz clic en el botón **"Añadir dominio personalizado"**.
4. Escribe el subdominio exacto:
   ```text
   marketing.ecomspain.com
   ```
5. Firebase verificará la propiedad y te mostrará los registros DNS requeridos.

---

## 🌐 Paso 2: Añadir los Registros en tu Proveedor de Dominio (DNS de ecomspain.com)

Accede al panel de control donde gestionas los DNS de `ecomspain.com` (por ejemplo: Cloudflare, DonDominio, Arsys, OVH, etc.) y añade el siguiente registro:

### Opción A (Recomendada - Registro CNAME):

| Tipo | Nombre / Host | Valor / Destino | TTL |
| :--- | :--- | :--- | :--- |
| **CNAME** | `marketing` | `ecomshop-marketing.web.app.` *(o el valor exacto que te proporcione Firebase)* | 3600 (1 hora) o Automático |

### Opción B (Registros A si tu proveedor lo solicita):

| Tipo | Nombre / Host | Dirección IP | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `marketing` | `199.36.158.100` | 3600 |

---

## 🔒 Paso 3: Certificado SSL y Propagación

* **SSL Automático:** Google aprovisiona automáticamente un certificado SSL gratuito administrado por Let's Encrypt / Google Trust Services.
* **Tiempo de Activación:** La propagación DNS suele tardar entre 5 y 30 minutos.
* Una vez completado, todo el tráfico hacia `https://marketing.ecomspain.com` se redirigirá de forma segura y transparente a tu contenedor de **Google Cloud Run** en la región de Bélgica (`europe-west1`).
