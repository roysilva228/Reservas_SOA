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
from datetime import datetime, date, time, timedelta

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
class Reserva(Base):
    __tablename__ = "Reservas"
    id_reserva = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_usuario_fk = Column(Integer, ForeignKey("Usuarios.id_usuario"))
    id_cancha_fk = Column(Integer, ForeignKey("Canchas.id_cancha"))
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
    estado = Column(Enum('disponible', 'reservado', 'mantenimiento', 'en_checkout'), nullable=False, default='disponible')
    id_reserva_fk = Column(Integer, ForeignKey("Reservas.id_reserva"), nullable=True)

class Usuario(Base):
    __tablename__ = "Usuarios"
    id_usuario = Column(Integer, primary_key=True)
    
class Cancha(Base):
    __tablename__ = "Canchas"
    id_cancha = Column(Integer, primary_key=True)
    precio_hora = Column(DECIMAL(10, 2))


# --- MODELOS DE DATOS (Pydantic) ---

class HorarioPublico(BaseModel):
    id_horario: int
    id_cancha_fk: int
    fecha: date
    hora_inicio: time
    hora_fin: time
    estado: str
    class Config:
        from_attributes = True

class ReservaCreate(BaseModel):
    id_horario: int

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
    id: int
    rol: str
    email: str

class GenerarHorariosRequest(BaseModel):
    id_cancha: int
    fecha_inicio: date
    fecha_fin: date
    hora_inicio: time
    hora_fin: time
    intervalo_minutos: int = 60

# --- NUEVO MODELO PARA EL CHECKOUT ---
class ReservaCheckout(BaseModel):
    id_horario: int 
    metodo_pago: str = Field(..., pattern="^(presencial|online)$")
# --- FIN DEL NUEVO MODELO ---


# --- DEPENDENCIAS (Seguridad y DB) ---
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

async def get_current_admin(current_user: TokenData = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación no permitida. Se requiere rol de administrador."
        )
    return current_user


# --- INICIALIZAR LA APLICACIÓN FASTAPI ---
app = FastAPI(
    title="Servicio de Reservas",
    description="API para gestionar la disponibilidad y creación de reservas."
)

# --- Configuración de CORS ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174", # Agrega esto en los otros archivos también
    "http://127.0.0.1:5174", # Agrega esto en los otros archivos también
    
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
    print("Iniciando Servicio de Reservas.")


# --- ENDPOINTS DE LA API ---

# 1. ENDPOINT PÚBLICO: Obtener Disponibilidad
@app.get("/disponibilidad/", response_model=List[HorarioPublico])
def obtener_disponibilidad(
    id_cancha: int = Query(...), 
    fecha: date = Query(...), 
    db: Session = Depends(get_db)
):
    """ Endpoint PÚBLICO para ver la agenda de una cancha en una fecha específica. """
    horarios = db.query(HorarioDisponible).filter(
        HorarioDisponible.id_cancha_fk == id_cancha,
        HorarioDisponible.fecha == fecha
    ).order_by(HorarioDisponible.hora_inicio).all()
    
    if not horarios:
        return []
        
    return horarios

# 2. ENDPOINT DE ADMIN: Generar Horarios en Lote
@app.post("/disponibilidad/generar-bloque", status_code=status.HTTP_201_CREATED)
def generar_bloque_horarios(
    request: GenerarHorariosRequest,
    db: Session = Depends(get_db),
    admin_user: TokenData = Depends(get_current_admin)
):
    """ Endpoint PROTEGIDO (Admin) para crear horarios disponibles en masa. """
    
    horarios_creados = 0
    dia_actual = request.fecha_inicio
    delta_dia = timedelta(days=1)
    
    while dia_actual <= request.fecha_fin:
        hora_actual = request.hora_inicio
        delta_intervalo = timedelta(minutes=request.intervalo_minutos)
        
        while hora_actual < request.hora_fin:
            hora_fin_bloque = (datetime.combine(dia_actual, hora_actual) + delta_intervalo).time()
            
            if hora_fin_bloque > request.hora_fin:
                break 

            nuevo_horario = HorarioDisponible(
                id_cancha_fk=request.id_cancha,
                fecha=dia_actual,
                hora_inicio=hora_actual,
                hora_fin=hora_fin_bloque,
                estado='disponible'
            )
            db.add(nuevo_horario)
            horarios_creados += 1
            
            hora_actual = hora_fin_bloque
            
        dia_actual += delta_dia

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar horarios: {e}")

    return {"detail": f"{horarios_creados} bloques de horarios creados exitosamente."}

# 3. ENDPOINT NUEVO: Bloquear Horario (Inicio de Checkout)
@app.post("/reservas/bloquear-horario", response_model=HorarioPublico)
def bloquear_horario(
    reserva_in: ReservaCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Bloquea temporalmente un horario ('en_checkout') al iniciar el flujo de pago.
    """
    
    try:
        horario = db.query(HorarioDisponible).filter(
            HorarioDisponible.id_horario == reserva_in.id_horario
        ).with_for_update().first()
        
        if not horario or horario.estado != 'disponible':
            raise HTTPException(status_code=400, detail=f"Horario no disponible. Estado actual: {horario.estado}")

        # Aplicar el bloqueo temporal
        horario.estado = 'en_checkout'
        db.commit()
        db.refresh(horario)
        
        return horario

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al bloquear horario: {e}")


# 4. ENDPOINT MODIFICADO: Crear Reserva (Finalizar Checkout)
@app.post("/reservas/crear", response_model=ReservaPublica, status_code=status.HTTP_201_CREATED)
def crear_reserva(
    reserva_in: ReservaCheckout, # <-- ¡USA EL MODELO DE CHECKOUT!
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Endpoint PROTEGIDO para crear la reserva final (pendiente o confirmada).
    """
    
    try:
        # 1. Buscar y validar que el horario esté bloqueado (o que sea la hora reservada)
        horario = db.query(HorarioDisponible).filter(
            HorarioDisponible.id_horario == reserva_in.id_horario
        ).with_for_update().first()

        # Si no está en checkout (nuestro nuevo estado) o no está disponible, falla.
        if not horario or (horario.estado != 'en_checkout' and horario.estado != 'disponible'):
             raise HTTPException(status_code=400, detail=f"El horario ya no está en estado de pago temporal.")

        cancha = db.query(Cancha).filter(Cancha.id_cancha == horario.id_cancha_fk).first()
        if not cancha:
            raise HTTPException(status_code=404, detail="Cancha asociada no encontrada.")
        
        # --- LÓGICA DE ESTADO SEGÚN MÉTODO DE PAGO (IPD/Físico) ---
        if reserva_in.metodo_pago == 'presencial':
            estado_inicial = 'pendiente' # Modo IPD: Paga al llegar
        else:
            estado_inicial = 'confirmada' # Modo Online: Pago inmediato
        
        # 2. Crear el registro de la Reserva
        nueva_reserva = Reserva(
            id_usuario_fk=current_user.id,
            id_cancha_fk=horario.id_cancha_fk,
            fecha_reserva=horario.fecha,
            hora_inicio=horario.hora_inicio,
            hora_fin=horario.hora_fin,
            monto_pagado=cancha.precio_hora,
            estado_reserva=estado_inicial # <-- ESTADO INICIAL
        )
        
        db.add(nueva_reserva)
        db.flush() 

        # 3. Actualizar el bloque de horario a 'reservado'
        horario.estado = 'reservado'
        horario.id_reserva_fk = nueva_reserva.id_reserva
        
        db.commit()
        db.refresh(nueva_reserva)
        
        return nueva_reserva

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno al crear reserva: {e}")


# 5. ENDPOINT NUEVO: Historial de Cliente
@app.get("/reservas/mi-historial", response_model=List[ReservaPublica])
def obtener_historial_cliente(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user) # Protegido
):
    """
    Endpoint PROTEGIDO para que el cliente vea todas sus reservas.
    """
    reservas = db.query(Reserva).filter(
        Reserva.id_usuario_fk == current_user.id
    ).order_by(Reserva.fecha_creacion.desc()).all()
    
    return reservas


# --- FUNCIÓN PARA CORRER ---
if __name__ == "__main__":
    print("Iniciando servidor de FastAPI en http://127.0.0.1:8002")
    uvicorn.run("servicio_reservas:app", host="127.0.0.1", port=8002, reload=True)