# --- IMPORTS ---
import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy import create_engine, Column, Integer, String, Text, DECIMAL, ForeignKey
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

# --- MODELOS DE BASE DE DATOS (SQLAlchemy) ---
class Sede(Base):
    __tablename__ = "Sedes"
    id_sede = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(150), nullable=False)
    direccion = Column(String(255), nullable=False)
    distrito = Column(String(100), nullable=True)
    url_foto_sede = Column(String(500), nullable=True)
    canchas = relationship("Cancha", back_populates="sede")

class Cancha(Base):
    __tablename__ = "Canchas"
    id_cancha = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=True)
    tipo_superficie = Column(String(50), nullable=True)
    ubicacion = Column(String(255), nullable=True)
    precio_hora = Column(DECIMAL(10, 2), nullable=False)
    url_foto = Column(String(500), nullable=True)
    id_sede_fk = Column(Integer, ForeignKey("Sedes.id_sede"), nullable=True)
    sede = relationship("Sede", back_populates="canchas")


# --- MODELOS DE DATOS (Pydantic) ---

class SedePublica(BaseModel):
    id_sede: int
    nombre: str
    direccion: str
    distrito: Optional[str] = None
    url_foto_sede: Optional[str] = None
    class Config:
        from_attributes = True

# --- ¡¡MODELOS DE ADMIN QUE FALTABAN!! ---
class SedeCreate(BaseModel):
    nombre: str
    direccion: str
    distrito: Optional[str] = None
    url_foto_sede: Optional[str] = None

class SedeUpdate(BaseModel):
    nombre: Optional[str] = None
    direccion: Optional[str] = None
    distrito: Optional[str] = None
    url_foto_sede: Optional[str] = None
# --- FIN DE LOS MODELOS ---

class CanchaPublica(BaseModel):
    id_cancha: int
    nombre: str
    descripcion: Optional[str] = None
    tipo_superficie: Optional[str] = None
    precio_hora: float
    url_foto: Optional[str] = None
    sede: Optional[SedePublica] = None 
    class Config:
        from_attributes = True

class CanchaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    tipo_superficie: Optional[str] = None
    ubicacion: Optional[str] = None
    precio_hora: float = Field(..., gt=0)
    url_foto: Optional[str] = None
    id_sede_fk: Optional[int] = None

class TokenData(BaseModel):
    email: str
    id: int
    rol: str

# --- DEPENDENCIAS (get_db, get_current_user, get_current_admin) ---
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
    allow_methods=["*"],       # ¡Permite PUT, POST, DELETE!
    allow_headers=["*"],
)

# --- Evento de Inicio ---
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

# --- ENDPOINTS DE LA API ---

# --- CRUD de Sedes ---
@app.get("/sedes/", response_model=List[SedePublica])
def listar_sedes(db: Session = Depends(get_db)):
    """ Endpoint PÚBLICO para listar todas las Sedes. """
    sedes = db.query(Sede).all()
    return sedes

# --- ¡¡ENDPOINTS DE ADMIN QUE FALTABAN!! ---

@app.post("/sedes/", response_model=SedePublica, status_code=status.HTTP_201_CREATED)
def crear_sede(
    sede: SedeCreate,
    db: Session = Depends(get_db),
    admin_user: TokenData = Depends(get_current_admin) # <-- PROTEGIDO!
):
    """ Endpoint PROTEGIDO (Solo Admin) para crear una nueva sede. """
    # Corregido a .model_dump() para Pydantic V2
    db_sede = Sede(**sede.model_dump())
    db.add(db_sede)
    db.commit()
    db.refresh(db_sede)
    return db_sede

@app.put("/sedes/{id_sede}", response_model=SedePublica)
def actualizar_sede(
    id_sede: int,
    sede: SedeUpdate,
    db: Session = Depends(get_db),
    admin_user: TokenData = Depends(get_current_admin) # <-- PROTEGIDO!
):
    """ Endpoint PROTEGIDO (Solo Admin) para actualizar una sede. """
    db_sede = db.query(Sede).filter(Sede.id_sede == id_sede).first()
    if not db_sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    # Corregido a .model_dump() para Pydantic V2
    update_data = sede.model_dump(exclude_unset=True) 
    for key, value in update_data.items():
        setattr(db_sede, key, value)
        
    db.commit()
    db.refresh(db_sede)
    return db_sede

@app.delete("/sedes/{id_sede}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_sede(
    id_sede: int,
    db: Session = Depends(get_db),
    admin_user: TokenData = Depends(get_current_admin) # <-- PROTEGIDO!
):
    """ Endpoint PROTEGIDO (Solo Admin) para eliminar una sede. """
    db_sede = db.query(Sede).filter(Sede.id_sede == id_sede).first()
    if not db_sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
        
    db.delete(db_sede)
    db.commit()
    return None

# --- FIN DE LOS ENDPOINTS QUE FALTABAN ---


# --- CRUD de Canchas ---
@app.get("/canchas/", response_model=List[CanchaPublica])
def listar_canchas(
    skip: int = 0, 
    limit: int = 100, 
    id_sede: Optional[int] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(Cancha).options(joinedload(Cancha.sede))
    if id_sede:
        query = query.filter(Cancha.id_sede_fk == id_sede)
    canchas = query.offset(skip).limit(limit).all()
    return canchas

@app.get("/canchas/{id_cancha}", response_model=CanchaPublica)
def obtener_cancha(id_cancha: int, db: Session = Depends(get_db)):
    cancha = db.query(Cancha).options(joinedload(Cancha.sede))\
        .filter(Cancha.id_cancha == id_cancha).first()
    if cancha is None:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    return cancha

@app.post("/canchas/", response_model=CanchaPublica, status_code=status.HTTP_201_CREATED)
def crear_cancha(
    cancha: CanchaCreate, 
    db: Session = Depends(get_db), 
    admin_user: TokenData = Depends(get_current_admin)
):
    print(f"Admin {admin_user.email} está creando una cancha.")
    # Convertimos el modelo Pydantic a un diccionario
    cancha_data = cancha.model_dump()
    # Creamos el objeto Cancha (SQLAlchemy) con los datos
    db_cancha = Cancha(**cancha_data)
    db.add(db_cancha)
    db.commit()
    db.refresh(db_cancha)
    return db_cancha

# --- FUNCIÓN PARA CORRER ---
if __name__ == "__main__":
    print("Iniciando servidor de FastAPI en http://127.0.0.1:8001")
    uvicorn.run("servicio_canchas:app", host="127.0.0.1", port=8001, reload=True)