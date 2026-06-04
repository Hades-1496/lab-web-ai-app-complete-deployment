import os
import asyncio
import jwt
import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI()

# PASO 1: CORS
ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# PASO 2: Auth básica y JWT (Bonus)
DEMO_TOKEN = os.getenv("DEMO_TOKEN", "demo-token-12345")
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-123")
security = HTTPBearer()

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    token = creds.credentials
    if token == DEMO_TOKEN:
        return {"user": "demo"}
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return {"user": payload.get("sub", "user")}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

class ChatInput(BaseModel):
    message: str
    session_id: str

class LoginInput(BaseModel):
    email: str
    password: str

@app.post("/api/login")
def login(body: LoginInput):
    # Se acepta cualquier email, pero la contraseña debe coincidir con DEMO_TOKEN (o ser 'password123')
    if body.password == DEMO_TOKEN or body.password == "password123":
        payload = {
            "sub": body.email,
            "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
        return {"token": token}
    raise HTTPException(status_code=401, detail="Credenciales incorrectas")


# Función auxiliar para comprobar prompt injection (Bonus)
def check_prompt_injection(message: str):
    if "ignora instrucciones" in message.lower():
        raise HTTPException(status_code=400, detail="Prompt injection detectado")

# AGENTE SIMULADO PARA QUE PUEDAS TERMINAR EL LAB
class MockAgent:
    async def astream(self, input_data, config=None):
        msg = input_data.get("messages", [{}])[0].get("content", "")
        respuesta = f"¡Hola! Soy el agente simulado. He recibido tu mensaje: '{msg}'. Todo funciona perfectamente."
        # Simulamos que la IA "piensa" y envía palabra por palabra
        for word in respuesta.split():
            await asyncio.sleep(0.1)
            yield {"messages": [type("obj", (object,), {"content": word + " "})()]}

    async def ainvoke(self, input_data, config=None):
        msg = input_data.get("messages", [{}])[0].get("content", "")
        respuesta = f"¡Hola! Soy el agente simulado. He recibido tu mensaje: '{msg}'. Todo funciona perfectamente."
        class MockMessage:
            def __init__(self, content):
                self.content = content
        return {"messages": [MockMessage(respuesta)]}

agente = MockAgent()

# Endpoint de Salud (Fase 3 / 4)
@app.get("/health")
def health():
    return {"status": "ok"}

# Endpoint estándar /api/chat para pruebas de testing (Fase 3)
@app.post("/api/chat")
async def chat(body: ChatInput, user=Depends(get_current_user)):
    check_prompt_injection(body.message)
    res = await agente.ainvoke(
        {"messages": [{"role": "user", "content": body.message}]},
        config={"configurable": {"thread_id": body.session_id}},
    )
    last_msg = res["messages"][-1]
    content = last_msg.content if hasattr(last_msg, "content") else last_msg.get("content", "")
    return {"response": content}

# PASO 5: Endpoint de Streaming
@app.post("/api/chat/stream")
async def chat_stream(body: ChatInput, user=Depends(get_current_user)):
    check_prompt_injection(body.message)
    async def generar():
        async for chunk in agente.astream(
            {"messages": [{"role": "user", "content": body.message}]},
            config={"configurable": {"thread_id": body.session_id}},
        ):
            if "messages" in chunk:
                content = chunk["messages"][-1].content
                if content:
                    safe = content.replace("\n", "\\n")
                    yield f"data: {safe}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generar(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )