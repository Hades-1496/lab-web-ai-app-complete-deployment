![logo_ironhack_blue 7](https://user-images.githubusercontent.com/23629340/40541063-a07a0a8a-601a-11e8-91b5-2f13e4e6b441.png)

# Lab | Despliegue Completo de la App IA

## 🚀 Enlaces de Producción
- **Frontend (Netlify)**: [https://statuesque-faun-8c94a7.netlify.app](https://statuesque-faun-8c94a7.netlify.app)
- **Backend (Railway)**: [https://lab-web-ai-app-complete-deployment-production-9c11.up.railway.app](https://lab-web-ai-app-complete-deployment-production-9c11.up.railway.app)
- **Endpoint de Salud (Health Check)**: [https://lab-web-ai-app-complete-deployment-production-9c11.up.railway.app/health](https://lab-web-ai-app-complete-deployment-production-9c11.up.railway.app/health)

## Objetivo

<!-- Desplegar la app construida en D1, D2 y D4 — backend FastAPI en Railway y frontend React en Netlify — de forma que funcione con URL pública y el agente IA responda en producción. -->

Desplegar la app construida en los días anteriores — backend FastAPI en Railway y frontend React en Netlify — de forma que funcione con URL pública y el agente IA responda en producción.

Al finalizar tendrás:
- Una URL pública para el backend (Railway)
- Una URL pública para el frontend (Netlify)
- CI/CD básico con GitHub Actions
- Al menos 3 tests que corren en el pipeline
- Variables de entorno gestionadas correctamente (sin credenciales en el código)

## Punto de partida

La app del D4:
```shell
lab-web-ai-app-complete-deployment/
├── backend/       ← FastAPI + LangGraph + PostgreSQL + CORS
└── frontend/      ← React + Chat + JWT
```

## Fase 1 — Preparar el backend para producción

### 1.1 Dockerfile

Crea `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Importante**: Railway inyecta la variable `$PORT`. Actualiza el `CMD`:
```dockerfile
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### 1.2 .dockerignore

```shell
.env
.env.*
__pycache__/
*.pyc
.venv/
venv/
chroma_db/
*.sqlite
tests/
.git/
```

### 1.3 Verificar que el puerto usa $PORT

```python
# Verificar en main.py que ALLOWED_ORIGINS viene de variable de entorno
ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
```

### 1.4 .env.example (subir al repositorio)

```shell
OPENAI_API_KEY=
DATABASE_URL=
ALLOWED_ORIGINS=http://localhost:5173
SECRET_KEY=
DEMO_TOKEN=
```

## Fase 2 — CI/CD con GitHub Actions

Crea `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Configurar Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Instalar dependencias
        run: pip install -r backend/requirements.txt pytest httpx

      - name: Ejecutar tests
        env:
          OPENAI_API_KEY: "fake-key-for-tests"
          DATABASE_URL: "sqlite:///./test.db"
          DEMO_TOKEN: "demo-token-12345"
        run: pytest backend/tests/ -v --tb=short
```

## Fase 3 — Escribir los tests

Crea al menos 3 tests en `backend/tests/`:

```python
# backend/tests/conftest.py
import os
import pytest

@pytest.fixture(autouse=True)
def env_vars(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "fake-key")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./test.db")
    monkeypatch.setenv("DEMO_TOKEN", "demo-token-12345")
```

```python
# backend/tests/test_api.py
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
HEADERS = {"Authorization": "Bearer demo-token-12345"}

def test_health():
    res = client.get("/health")
    assert res.status_code == 200

def test_chat_sin_token_rechazado():
    res = client.post("/api/chat", json={"message": "Hola"})
    assert res.status_code in (401, 403)

def test_chat_con_token_y_llm_mockeado():
    respuesta_falsa = {"messages": [MagicMock(content="Respuesta mockeada")]}
    with patch("main.agente") as mock_agente:
        mock_agente.ainvoke = AsyncMock(return_value=respuesta_falsa)
        res = client.post(
            "/api/chat",
            json={"message": "Hola", "session_id": "test"},
            headers=HEADERS,
        )
    assert res.status_code == 200
    assert "response" in res.json()
```

Verifica que los tests pasan localmente:
```bash
pytest backend/tests/ -v
```

## Fase 4 — Deploy del backend en Railway

1. Sube todos los cambios a GitHub:
   ```bash
   git add .
   git commit -m "feat: preparar para deploy (Docker, CI, tests)"
   git push origin main
   ```

2. En [railway.app](https://railway.app):
   - `New Project → Deploy from GitHub repo`
   - Selecciona tu repositorio
   - **Root Directory**: `backend`

3. Añade PostgreSQL:
   - `+ New → Database → Add PostgreSQL`
   - Railway añade `DATABASE_URL` automáticamente al servicio

4. Añade las variables:
   ```shell
   OPENAI_API_KEY = sk-proj-...
   SECRET_KEY = # (genera con: python -c "import secrets; print(secrets.token_hex(32))")
   DEMO_TOKEN = # (genera con: python -c "import secrets; print(secrets.token_hex(16))")
   ```
   Deja `ALLOWED_ORIGINS` para cuando tengas la URL de Netlify.

5. Genera un dominio público:
   `Settings → Domains → Generate Domain`

6. Verifica:
   
   ```shell
   curl https://mi-backend.railway.app/health
   
   # → {"status": "ok"}
   ```

## Fase 5 — Deploy del frontend en Netlify

1. En [netlify.com](https://netlify.com):
   - `Add new site → Import an existing project`
   - Elige GitHub → tu repositorio
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`

2. Añade la variable de entorno:
   ```shell
   VITE_API_URL = https://mi-backend.railway.app
   ```

3. Crea `frontend/public/_redirects` para React Router:
   ```shell
   /*    /index.html   200
   ```

4. Sube el cambio y espera el redeploy:
   ```shell
   git add frontend/public/_redirects
   git commit -m "fix: netlify redirects for SPA routing"
   git push
   ```

## Fase 6 — Conectar ambas apps

Vuelve a Railway y actualiza la variable:
```shell
ALLOWED_ORIGINS = https://tu-app.netlify.app
```

Railway hará redeploy automático.

## Verificación end-to-end

Abre `https://tu-app.netlify.app` y comprueba:

- [ ] Redirige a `/login` (ruta protegida)
- [ ] Login con credenciales de prueba → redirige al chat
- [ ] El chat responde (el agente LangGraph funciona en Railway)
- [ ] Recarga en `/chat` → no da 404 (el `_redirects` funciona)
- [ ] Abre DevTools → Network → las peticiones van a `railway.app` (no a localhost)
- [ ] GitHub Actions muestra el pipeline verde en la pestaña Actions

## Entrega

```shell
lab-web-ai-app-complete-deployment/
├── .github/
│   └── workflows/
│       └── ci.yml
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   ├── main.py
│   ├── requirements.txt
│   └── tests/
│       ├── conftest.py
│       └── test_api.py
└── frontend/
    ├── public/
    │   └── _redirects
    ├── .env.example
    └── src/
```

## Checklist de entrega

- [ ] `backend/Dockerfile` usa `${PORT:-8000}` (no hardcoded 8000)
- [ ] `.dockerignore` excluye `.env` y `chroma_db/`
- [ ] `.env.example` documenta todas las variables necesarias
- [ ] Al menos 3 tests en `backend/tests/` que no necesitan API key real
- [ ] GitHub Actions ejecuta los tests en cada push (pestaña Actions verde)
- [ ] Backend desplegado en Railway con URL pública que responde a `/health`
- [ ] Frontend desplegado en Netlify con `VITE_API_URL` apuntando a Railway
- [ ] El chat funciona de extremo a extremo en producción
- [ ] Las credenciales NO están en el repositorio (`.env` en `.gitignore`)
- [ ] El `_redirects` de Netlify hace que React Router funcione en producción

## Bonus

- Configura el deploy automático a Railway desde GitHub Actions (usando el token de Railway como secreto)
- Añade un test de prompt injection: verifica que un mensaje con "ignora instrucciones" devuelve 400
- Implementa JWT real en el backend (en lugar del token estático) y actualiza el flujo de login en React