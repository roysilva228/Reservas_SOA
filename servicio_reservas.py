# --- IMPORTS ---
import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status, Query
from sqlalchemy import create_engine, Column, Integer, String, Enum, TIMESTAMP, DECIMAL, DATE, TIME, ForeignKey
from sqlalchemy.orm import sessionmaker, Session, relationship, joinedload
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.ext.declarative import declarative_base
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, date, time

# --- CONFIGURACIÓN DE BASE DE DATOS ---
DATABASE_URL = "mysql+pymysql://root:root@localhost:3306/reservas_canchas_soa"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- CONFIGURACIÓN DE SEGURIDAD ---
# ¡¡Debe ser IDÉNTICA a la de los otros servicios!!
SECRET_KEY = "mi-proyecto-soa-es-genial-12345"
ALGORITHM = "HS256"
bearer_scheme = HTTPBearer()

# --- MODELOS DE BASE DE DATOS (SQLAlchemy) ---
# Necesitamos que este servicio conozca las tablas `Reservas` y `Horarios_Disponibles`

class Reserva(Base):
    __tablename__ = "Reservas"
    
    id_reserva = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_usuario_fk = Column(Integer, ForeignKey("Usuarios.id_usuario")) # Necesita la tabla Usuarios
    id_cancha_fk = Column(Integer, ForeignKey("Canchas.id_cancha"))   # Necesita la tabla Canchas
    fecha_reserva = Column(DATE, nullable=False)
    hora_inicio = Column(TIME, nullable=False)
    hora_fin = Column(TIME, nullable=False)
    estado_reserva = Column(Enum('confirmada', 'pendiente', 'cancelada'), nullable=False, default='confirmada')
    monto_pagado = Column(DECIMAL(10, 2), nullable=False)
    fecha_creacion = Column(TIMESTAMP, default=datetime.utcnow)

class HorarioDisponible(Base):
    __tablename__ = "Horarios_Disponibles"
    
    id_horario = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_cancha_fk = Column(Integer, ForeignKey("Canchas.id_cancha"))
    fecha = Column(DATE, nullable=False)
    hora_inicio = Column(TIME, nullable=False)
    hora_fin = Column(TIME, nullable=False)
    estado = Column(Enum('disponible', 'reservado', 'mantenimiento'), nullable=False, default='disponible')
    id_reserva_fk = Column(Integer, ForeignKey("Reservas.id_reserva"), nullable=True)

# (Modelos "fantasma" de Usuario y Cancha para que las FK funcionen)
class Usuario(Base):
    __tablename__ = "Usuarios"
    id_usuario = Column(Integer, primary_key=True)
    
class Cancha(Base):
    __tablename__ = "Canchas"
    id_cancha = Column(Integer, primary_key=True)
    precio_hora = Column(DECIMAL(10, 2))


# --- MODELOS DE DATOS (Pydantic) ---

# Para mostrar la disponibilidad (la "agenda")
class HorarioPublico(BaseModel):
    id_horario: int
    id_cancha_fk: int
    fecha: date
    hora_inicio: time
    hora_fin: time
    estado: str

    class Config:
        from_attributes = True

# Lo que el frontend nos envía para crear una reserva
class ReservaCreate(BaseModel):
    id_horario: int # ¡El frontend solo necesita enviar el ID del bloque de horario!

# Lo que devolvemos al crear una reserva
class ReservaPublica(BaseModel):
    id_reserva: int
    id_usuario_fk: int
    id_cancha_fk: int
    fecha_reserva: date
    hora_inicio: time
    estado_reserva: str

    class Config:
        from_attributes = True

class TokenData(BaseModel):
    id: int # Solo necesitamos el ID del usuario del token
    rol: str
    email: str


# --- DEPENDENCIAS (Seguridad y DB) ---
# (Copiadas de servicio_canchas, pero TokenData solo necesita 'id')
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("id")
        rol: str = payload.get("rol")
        email: str = payload.get("sub")
        if user_id is None or rol is None or email is None:
            raise credentials_exception
        token_data = TokenData(id=user_id, rol=rol, email=email)
    except JWTError:
        raise credentials_exception
    return token_data


# --- INICIALIZAR LA APLICACIÓN FASTAPI ---
app = FastAPI(
    title="Servicio de Reservas",
    description="API para gestionar la disponibilidad y creación de reservas."
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
    # No creamos tablas aquí, asumimos que ya existen
    print("Iniciando Servicio de Reservas.")


# --- ENDPOINTS DE LA API ---

@app.get("/disponibilidad/", response_model=List[HorarioPublico])
def obtener_disponibilidad(
    # Usamos Query(...) para que sean parámetros obligatorios
    id_cancha: int = Query(...), 
    fecha: date = Query(...), 
    db: Session = Depends(get_db)
):
    """
    Endpoint PÚBLICO para ver la agenda de una cancha en una fecha específica.
    """
    horarios = db.query(HorarioDisponible).filter(
        HorarioDisponible.id_cancha_fk == id_cancha,
        HorarioDisponible.fecha == fecha
    ).order_by(HorarioDisponible.hora_inicio).all()
    
    if not horarios:
        # No es un error, solo no hay horarios cargados para ese día
        return []
        
    return horarios


@app.post("/reservas/crear", response_model=ReservaPublica, status_code=status.HTTP_201_CREATED)
def crear_reserva(
    reserva_in: ReservaCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user) # ¡Endpoint PROTEGIDO!
):
    """
    Endpoint PROTEGIDO para crear una nueva reserva.
    Esta es la lógica de negocio principal.
    """
    
    # --- Inicio de la Transacción ---
    try:
        # 1. Buscar el bloque de horario que el usuario quiere reservar
        horario = db.query(HorarioDisponible).filter(
            HorarioDisponible.id_horario == reserva_in.id_horario
        ).with_for_update().first() # with_for_update() "bloquea" esta fila para que nadie más la tome

        # 2. Validar el horario
        if not horario:
            raise HTTPException(status_code=404, detail="Bloque de horario no encontrado.")
            
        if horario.estado != 'disponible':
            raise HTTPException(status_code=400, detail="Este horario ya no está disponible.")

        # 3. (Opcional) Necesitamos el precio. Lo buscamos en la tabla Cancha.
        cancha = db.query(Cancha).filter(Cancha.id_cancha == horario.id_cancha_fk).first()
        if not cancha:
            raise HTTPException(status_code=404, detail="Cancha asociada no encontrada.")
        
        # 4. Crear el registro de la Reserva
        nueva_reserva = Reserva(
            id_usuario_fk=current_user.id,
            id_cancha_fk=horario.id_cancha_fk,
            fecha_reserva=horario.fecha,
            hora_inicio=horario.hora_inicio,
            hora_fin=horario.hora_fin,
            monto_pagado=cancha.precio_hora, # Usamos el precio de la cancha
            estado_reserva='confirmada' # Asumimos pago inmediato (simulado)
        )
        
        db.add(nueva_reserva)
        db.flush() # "Calcula" el ID de la nueva reserva antes de hacer commit

        # 5. Actualizar el bloque de horario para que ya no esté disponible
        horario.estado = 'reservado'
        horario.id_reserva_fk = nueva_reserva.id_reserva # ¡Lo vinculamos!
        
        # 6. ¡Todo o nada! Guardamos ambos cambios
        db.commit()
        db.refresh(nueva_reserva) # Actualizamos el objeto con los datos finales
        
        return nueva_reserva

    except Exception as e:
        # Si algo falla (ej. la base de datos se cae), revertimos todo.
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno al crear reserva: {e}")
    # --- Fin de la Transacción ---


# --- FUNCIÓN PARA CORRER ---
if __name__ == "__main__":
    print("Iniciando servidor de FastAPI en http://127.0.0.1:8002")
    uvicorn.run("servicio_reservas:app", host="127.0.0.1", port=8002, reload=True)