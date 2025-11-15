# --- IMPORTS ---
import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy import create_engine, Column, Integer, String, Text, DECIMAL
# NUEVO: Imports para relaciones (ForeignKey) y joins (relationship, joinedload)
from sqlalchemy import ForeignKey
from sqlalchemy.orm import sessionmaker, Session, relationship, joinedload
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.ext.declarative import declarative_base
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from fastapi.middleware.cors import CORSMiddleware

# --- CONFIGURACIÓN DE BASE DE DATOS ---
DATABASE_URL = "mysql+pymysql://root:root@localhost:3306/reservas_canchas_soa"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- CONFIGURACIÓN DE SEGURIDAD ---
SECRET_KEY = "mi-proyecto-soa-es-genial-12345"
ALGORITHM = "HS256"
bearer_scheme = HTTPBearer()

# --- NUEVO: MODELO DE BASE DE DATOS `Sedes` ---
class Sede(Base):
    __tablename__ = "Sedes"

    id_sede = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(150), nullable=False)
    direccion = Column(String(255), nullable=False)
    distrito = Column(String(100), nullable=True)
    url_foto_sede = Column(String(500), nullable=True)
    
    # NUEVO: Relación (Una sede tiene muchas canchas)
    canchas = relationship("Cancha", back_populates="sede")


# --- MODIFICADO: MODELO DE BASE DE DATOS `Canchas` ---
class Cancha(Base):
    __tablename__ = "Canchas"

    id_cancha = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=True)
    tipo_superficie = Column(String(50), nullable=True)
    ubicacion = Column(String(255), nullable=True) # (Este campo ahora es menos importante)
    precio_hora = Column(DECIMAL(10, 2), nullable=False)
    url_foto = Column(String(500), nullable=True)

    # NUEVO: La conexión a la tabla Sedes
    id_sede_fk = Column(Integer, ForeignKey("Sedes.id_sede"), nullable=True)
    
    # NUEVO: Relación (Esta cancha pertenece a una sede)
    sede = relationship("Sede", back_populates="canchas")


# --- MODELOS DE DATOS (Pydantic) ---

# --- NUEVO: Schema Pydantic para `Sede` ---
class SedePublica(BaseModel):
    id_sede: int
    nombre: str
    direccion: str
    distrito: Optional[str] = None
    url_foto_sede: Optional[str] = None

    class Config:
        # MODIFICADO: De 'orm_mode' a 'from_attributes' (Pydantic V2)
        from_attributes = True


# --- MODIFICADO: Schema Pydantic para `Cancha` ---
class CanchaPublica(BaseModel):
    id_cancha: int
    nombre: str
    descripcion: Optional[str] = None
    tipo_superficie: Optional[str] = None
    precio_hora: float
    url_foto: Optional[str] = None
    
    # NUEVO: Incluimos la info de la sede (anidada)
    sede: Optional[SedePublica] = None 

    class Config:
        from_attributes = True # MODIFICADO

# ... (CanchaCreate se queda igual por ahora) ...
class CanchaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    tipo_superficie: Optional[str] = None
    ubicacion: Optional[str] = None
    precio_hora: float = Field(..., gt=0)
    url_foto: Optional[str] = None
    id_sede_fk: Optional[int] = None # NUEVO: Para asignar al crear


class TokenData(BaseModel):
    email: str
    id: int
    rol: str

# --- DEPENDENCIAS (get_db, get_current_user, get_current_admin) ---
# ... (Estas 3 funciones se quedan exactamente igual) ...
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), db: Session = Depends(get_db)):
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: int = payload.get("id")
        rol: str = payload.get("rol")
        if email is None or user_id is None or rol is None:
            raise credentials_exception
        token_data = TokenData(email=email, id=user_id, rol=rol)
    except JWTError:
        raise credentials_exception
    return token_data

async def get_current_admin(current_user: TokenData = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación no permitida. Se requiere rol de administrador."
        )
    return current_user


# --- INICIALIZAR LA APLICACIÓN FASTAPI ---
app = FastAPI(
    title="Servicio de Canchas",
    description="API para gestionar la información de las canchas."
)

# --- Configuración de CORS ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Evento de Inicio ---
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


# --- ENDPOINTS DE LA API ---

# --- NUEVO: Endpoint para listar las Sedes ---
@app.get("/sedes/", response_model=List[SedePublica])
def listar_sedes(db: Session = Depends(get_db)):
    """
    Endpoint PÚBLICO para listar todas las Sedes.
    Perfecto para el dropdown de filtros en React.
    """
    sedes = db.query(Sede).all()
    return sedes


# --- MODIFICADO: Endpoint para listar Canchas (con filtro) ---
@app.get("/canchas/", response_model=List[CanchaPublica])
def listar_canchas(
    skip: int = 0, 
    limit: int = 100, 
    # NUEVO: Parámetro de query opcional para filtrar
    id_sede: Optional[int] = None, 
    db: Session = Depends(get_db)
):
    """
    Endpoint PÚBLICO para listar todas las canchas.
    Ahora incluye la info de la sede y permite filtrar por id_sede.
    """
    # MODIFICADO: Usamos 'joinedload' para traer la info de la sede
    # en una sola consulta eficiente (evita el "N+1 query problem")
    query = db.query(Cancha).options(joinedload(Cancha.sede))

    # NUEVO: Si el frontend nos manda un 'id_sede', filtramos
    if id_sede:
        query = query.filter(Cancha.id_sede_fk == id_sede)

    canchas = query.offset(skip).limit(limit).all()
    return canchas


@app.get("/canchas/{id_cancha}", response_model=CanchaPublica)
def obtener_cancha(id_cancha: int, db: Session = Depends(get_db)):
    # MODIFICADO: Usamos 'joinedload' aquí también
    cancha = db.query(Cancha).options(joinedload(Cancha.sede))\
        .filter(Cancha.id_cancha == id_cancha).first()
    
    if cancha is None:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    return cancha

# --- MODIFICADO: Endpoint para crear Canchas (asignando sede) ---
@app.post("/canchas/", response_model=CanchaPublica, status_code=status.HTTP_201_CREATED)
def crear_cancha(
    cancha: CanchaCreate, 
    db: Session = Depends(get_db), 
    admin_user: TokenData = Depends(get_current_admin)
):
    print(f"Admin {admin_user.email} está creando una cancha.")
    
    # MODIFICADO: Pasamos el 'cancha.dict()'
    db_cancha = Cancha(**cancha.dict())
    
    db.add(db_cancha)
    db.commit()
    db.refresh(db_cancha)
    
    # (Faltaría cargar la info de la sede aquí, pero para 201 está bien)
    return db_cancha


# --- FUNCIÓN PARA CORRER ---
if __name__ == "__main__":
    print("Iniciando servidor de FastAPI en http://127.0.0.1:8001")
    uvicorn.run("servicio_canchas:app", host="127.0.0.1", port=8001, reload=True)