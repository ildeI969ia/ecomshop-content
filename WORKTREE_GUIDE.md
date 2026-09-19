# 🚀 Guía de Desarrollo Ultrarrápido con Git Worktrees + GitHub

Esta guía describe cómo utilizar el sistema de **Git Worktrees** en `ecomshop-content` para desarrollar múltiples features en paralelo, sin bloqueos, sin stash y sin reinstalar `node_modules`.

---

## ⚡ ¿Por qué Git Worktrees?

Normalmente, cambiar de rama en Git (`git checkout` / `git switch`) te obliga a:
1. Detener el servidor de desarrollo (`npm run dev`).
2. Guardar o hacer stash de los cambios pendientes.
3. Si cambias de rama, tus archivos locales se sustituyen.

Con **Worktrees**:
- Cada rama vive en su propia carpeta física independiente (`c:\imf\eniquecer blog\.worktrees\<rama>`).
- Puedes tener el servidor de `main` en el puerto `3000` y el de tu nueva feature en el puerto `3001` al mismo tiempo.
- **Cero espera**: Nuestro script vincula `node_modules` mediante *NTFS Junction* y copia `.env.local` automáticamente. La nueva rama está lista para codificar en **menos de 2 segundos**.

---

## 🛠️ Comandos Rápidos (NPM)

| Acción | Comando | Descripción |
|---|---|---|
| **Crear Worktree** | `npm run wt:new feat/mi-feature` | Crea la rama y carpeta en `.worktrees/feat-mi-feature` con `node_modules` y `.env.local`. |
| **Listar Worktrees** | `npm run wt:list` | Muestra qué worktrees y ramas tienes activos actualmente. |
| **Iniciar Servidor Dev** | `npm run wt:dev feat/mi-feature 3001` | Arranca `next dev` en el puerto indicado dentro de ese worktree. |
| **Eliminar Worktree** | `npm run wt:remove feat/mi-feature` | Desmonta el worktree de forma segura cuando hayas terminado la tarea. |

---

## 📋 Flujo de Trabajo Recomendado paso a paso

### 1. Crear una nueva rama/worktree
Desde la carpeta principal `ecomshop-content`:
```bash
npm run wt:new feat/nuevo-generador
```

### 2. Abrir la carpeta y trabajar
Navega a la carpeta del worktree (puedes abrir otra ventana de VS Code / Cursor / AntiGravity en ella):
```bash
cd "..\.worktrees\feat-nuevo-generador"
npm run dev -- -p 3001
```

### 3. Hacer commits y subir a GitHub
Dentro de la carpeta del worktree, trabaja normalmente con Git:
```bash
git add .
git commit -m "feat: nuevo generador implementado"
git push -u origin feat/nuevo-generador
```

### 4. Crear Pull Request en GitHub o fusionar a Main
Una vez aprobado o listo:
- Puedes abrir el Pull Request directamente en GitHub: `https://github.com/ildeI969ia/ecomshop-content/pulls`
- O fusionarlo localmente en `main`:
  ```bash
  cd "..\..\ecomshop-content"
  git merge feat/nuevo-generador
  git push origin main
  ```

### 5. Limpiar el worktree
Cuando ya no lo necesites:
```bash
npm run wt:remove feat/nuevo-generador
```
*(Nota: Esto no borra la rama en Git ni en GitHub, solo la carpeta de trabajo temporal)*.
