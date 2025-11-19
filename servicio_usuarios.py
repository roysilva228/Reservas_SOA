# --- IMPORTS ---
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy import create_engine, Column, Integer, String, Enum, TIMESTAMP, DECIMAL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import time
# --- NUEVOS IMPORTS ---
import httpx  # Para llamar a la API externa
import os     # Para leer variables de entorno

# --- CONFIGURACIÓN DE SEGURIDAD (JWT Tokens) ---
SECRET_KEY = "mi-proyecto-soa-es-genial-12345"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# --- NUEVO: Cargar la clave secreta de la API externa ---
DECOLECTA_API_KEY = os.environ.get("DECOLECTA_API_KEY")

# --- CONFIGURACIÓN DE BASE DE DATOS ---
DATABASE_URL = "mysql+pymysql://root:root@localhost:3306/reservas_canchas_soa"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- MODELOS ---
class Usuario(Base):
    __tablename__ = "Usuarios"
    id_usuario = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    telefono = Column(String(20), nullable=True)
    fecha_registro = Column(TIMESTAMP, default=datetime.utcnow)
    rol = Column(Enum('cliente', 'admin'), default='cliente')

class UsuarioCreate(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr
    password: str

class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UsuarioPublico(BaseModel):
    id_usuario: int
    nombre: str
    email: EmailStr
    rol: str
    class Config:
        from_attributes = True

# --- FUNCIONES AUXILIARES ---
def verificar_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def hashear_password(password):
    return pwd_context.hash(password)

def crear_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- INICIALIZAR LA APLICACIÓN FASTAPI ---
app = FastAPI(
    title="Servicio de Usuarios",
    description="API para el registro y autenticación de usuarios."
)

# --- CONFIGURACIÓN DE CORS (CORREGIDO PARA PUERTO 5174) ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174", # <-- AGREGADO POR SI VITE CAMBIA DE PUERTO
    "http://127.0.0.1:5174", # <-- AGREGADO
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- EVENTO STARTUP ---
@app.on_event("startup")
def on_startup():
    print("Iniciando servicio de Usuarios. Intentando conectar a la DB...")
    if not DECOLECTA_API_KEY:
        print("¡¡¡ADVERTENCIA!!!: Variable 'DECOLECTA_API_KEY' no encontrada.")
        print("El endpoint de DNI no funcionará.")
    
    retries = 5
    while retries > 0:
        try:
            connection = engine.connect()
            connection.close()
            print("¡Conexión a la base de datos exitosa!")
            Base.metadata.create_all(bind=engine)
            break
        except Exception as e:
            print(f"Error conectando a la DB: {e}")
            retries -= 1
            time.sleep(5)

# --- ENDPOINTS DE LA API ---

@app.get("/usuarios/consultar-dni")
async def consultar_dni(dni: str):
    """ Endpoint proxy para consultar DNI de forma segura. """
    if not DECOLECTA_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio de consulta DNI no está configurado."
        )
        
    url_api = f"https://api.decolecta.com/v1/reniec/dni?numero={dni}"
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {DECOLECTA_API_KEY}"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url_api, headers=headers, timeout=10.0)
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Error de la API externa: {response.text}"
                )
            return response.json()
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error conectando a la API de DNI: {e}"
            )

@app.post("/usuarios/registrar", response_model=UsuarioPublico, status_code=status.HTTP_201_CREATED)
def registrar_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    db_usuario = db.query(Usuario).filter(Usuario.email == usuario.email).first()
    if db_usuario:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El email ya está registrado.")
    password_hasheada = hashear_password(usuario.password)
    nuevo_usuario = Usuario(nombre=usuario.nombre, apellido=usuario.apellido, email=usuario.email, password_hash=password_hasheada)
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario

@app.post("/usuarios/login", response_model=Token)
def login_para_access_token(usuario_login: UsuarioLogin, db: Session = Depends(get_db)):
    db_usuario = db.query(Usuario).filter(Usuario.email == usuario_login.email).first()
    if not db_usuario or not verificar_password(usuario_login.password, db_usuario.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email o contraseña incorrectos.", headers={"WWW-Authenticate": "Bearer"})
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # --- MODIFICACIÓN: Agregamos el nombre al token ---
    access_token = crear_access_token(
        data={
            "sub": db_usuario.email, 
            "id": db_usuario.id_usuario, 
            "rol": db_usuario.rol,
            "nombre": db_usuario.nombre # <-- ESTO ES LO NUEVO
        }, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- FUNCIÓN PARA CORRER LA APP ---
if __name__ == "__main__":
    print("Iniciando servidor de FastAPI en http://127.0.0.1:8000")
    uvicorn.run("servicio_usuarios:app", host="127.0.0.1", port=8000, reload=True)