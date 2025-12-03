# servicio_reservas.py

# --- IMPORTS ---
import uvicorn
import os
from fastapi import FastAPI, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy import create_engine, Column, Integer, String, Enum, TIMESTAMP, DECIMAL, DATE, TIME, ForeignKey
from sqlalchemy.orm import sessionmaker, Session, relationship, joinedload
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from sqlalchemy.ext.declarative import declarative_base
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, date, time, timedelta

# --- IMPORT PARA CONEXIÓN HTTP (BREVO) ---
import httpx 

# --- CONFIGURACIÓN DE BASE DE DATOS ---
DATABASE_URL = "mysql+pymysql://ut7d9efdtwi5fvc4:w7blhZY331yv2KaH9cb4@b4teebota5hwrrxncdzb-mysql.services.clever-cloud.com:3306/b4teebota5hwrrxncdzb"

engine = create_engine(
    DATABASE_URL,
    pool_size=1,
    max_overflow=1,
    pool_timeout=30,
    pool_recycle=1800
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- CONFIGURACIÓN DE SEGURIDAD ---
SECRET_KEY = "mi-proyecto-soa-es-genial-12345"
ALGORITHM = "HS256"
bearer_scheme = HTTPBearer()

# --- MODELOS SQLALCHEMY ---
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

# --- MODELOS PYDANTIC ---

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
    monto_pagado: float
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

class ReservaCheckout(BaseModel):
    id_horario: int 
    metodo_pago: str = Field(..., pattern="^(presencial|online)$")

# --- DEPENDENCIAS ---
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

# --- FUNCIÓN DE ENVÍO DE CORREO CON BREVO (ACTUALIZADA) ---
async def enviar_correo_brevo(destinatario: str, asunto: str, html_content: str):
    """
    Envía un correo usando la API REST de Brevo con el nombre correcto.
    """
    url = "https://api.brevo.com/v3/smtp/email"
    api_key = os.environ.get("BREVO_API_KEY")
    # AQUI CAMBIAMOS EL DEFAULT AL NUEVO NOMBRE
    sender_email = os.environ.get("MAIL_SENDER_EMAIL", "no-reply@deportivamas.com")
    # AQUI ESTA EL CAMBIO DE NOMBRE DEL REMITENTE
    sender_name = os.environ.get("MAIL_SENDER_NAME", "DeportivaMas")

    if not api_key:
        print("❌ Error: Falta BREVO_API_KEY en variables de entorno")
        return

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": destinatario}],
        "subject": asunto,
        "htmlContent": html_content
    }

    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            
        if response.status_code == 201:
            print(f"✅ Correo enviado con Brevo a {destinatario}")
        else:
            print(f"❌ Error Brevo: {response.text}")
    except Exception as e:
        print(f"❌ Excepción enviando correo: {e}")


# --- APP ---
app = FastAPI(title="Servicio de Reservas", description="API para gestionar reservas.")

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    print("Iniciando Servicio de Reservas...")
    Base.metadata.create_all(bind=engine)
    print("Tablas verificadas/creadas exitosamente.")

# --- ENDPOINTS ---

@app.get("/disponibilidad/", response_model=List[HorarioPublico])
def obtener_disponibilidad(id_cancha: int = Query(...), fecha: date = Query(...), db: Session = Depends(get_db)):
    horarios = db.query(HorarioDisponible).filter(
        HorarioDisponible.id_cancha_fk == id_cancha,
        HorarioDisponible.fecha == fecha
    ).order_by(HorarioDisponible.hora_inicio).all()
    return horarios or []

@app.post("/disponibilidad/generar-bloque", status_code=status.HTTP_201_CREATED)
def generar_bloque_horarios(request: GenerarHorariosRequest, db: Session = Depends(get_db), admin_user: TokenData = Depends(get_current_admin)):
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
                id_cancha_fk=request.id_cancha, fecha=dia_actual, hora_inicio=hora_actual,
                hora_fin=hora_fin_bloque, estado='disponible'
            )
            db.add(nuevo_horario)
            horarios_creados += 1
            hora_actual = hora_fin_bloque
        dia_actual += delta_dia

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {e}")
    return {"detail": f"{horarios_creados} bloques creados."}

@app.post("/reservas/bloquear-horario", response_model=HorarioPublico)
def bloquear_horario(reserva_in: ReservaCreate, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    try:
        horario = db.query(HorarioDisponible).filter(HorarioDisponible.id_horario == reserva_in.id_horario).with_for_update().first()
        if not horario or horario.estado != 'disponible':
            raise HTTPException(status_code=400, detail=f"Horario no disponible.")
        horario.estado = 'en_checkout'
        db.commit()
        db.refresh(horario)
        return horario
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {e}")

# --- CREAR RESERVA (CON DISEÑO PRO) ---
@app.post("/reservas/crear", response_model=ReservaPublica, status_code=status.HTTP_201_CREATED)
async def crear_reserva(
    reserva_in: ReservaCheckout, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db), 
    current_user: TokenData = Depends(get_current_user)
):
    try:
        horario = db.query(HorarioDisponible).filter(HorarioDisponible.id_horario == reserva_in.id_horario).with_for_update().first()
        if not horario or (horario.estado != 'en_checkout' and horario.estado != 'disponible'):
             raise HTTPException(status_code=400, detail=f"El horario ya no está en proceso de pago.")

        cancha = db.query(Cancha).filter(Cancha.id_cancha == horario.id_cancha_fk).first()
        if not cancha:
            raise HTTPException(status_code=404, detail="Cancha no encontrada.")
        
        estado_inicial = 'pendiente' if reserva_in.metodo_pago == 'presencial' else 'confirmada'
        
        nueva_reserva = Reserva(
            id_usuario_fk=current_user.id,
            id_cancha_fk=horario.id_cancha_fk,
            fecha_reserva=horario.fecha,
            hora_inicio=horario.hora_inicio,
            hora_fin=horario.hora_fin,
            monto_pagado=cancha.precio_hora,
            estado_reserva=estado_inicial
        )
        
        db.add(nueva_reserva)
        db.flush() 

        horario.estado = 'reservado'
        horario.id_reserva_fk = nueva_reserva.id_reserva
        
        db.commit()
        db.refresh(nueva_reserva)

        # === NUEVO DISEÑO DE BOLETA HTML (DeportivaMas) ===
        color_estado = "#22c55e" if estado_inicial == 'confirmada' else "#eab308"
        texto_estado = "PAGO EXITOSO" if estado_inicial == 'confirmada' else "PAGO PENDIENTE"

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }}
            .header {{ background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px; text-align: center; color: white; }}
            .logo {{ font-size: 28px; font-weight: 800; letter-spacing: -1px; margin-bottom: 5px; }}
            .subtitle {{ font-size: 14px; opacity: 0.9; font-weight: 300; }}
            .content {{ padding: 40px; }}
            .greeting {{ font-size: 20px; color: #1f2937; margin-bottom: 10px; text-align: center; font-weight: 600; }}
            .message {{ text-align: center; color: #6b7280; font-size: 15px; margin-bottom: 30px; line-height: 1.5; }}
            
            .ticket {{ background-color: #f9fafb; border: 2px dashed #d1d5db; border-radius: 12px; padding: 25px; position: relative; }}
            .row {{ display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }}
            .row:last-child {{ border-bottom: none; margin-bottom: 0; padding-bottom: 0; }}
            .label {{ color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }}
            .value {{ color: #111827; font-weight: 700; font-size: 15px; text-align: right; }}
            
            .badge {{ display: inline-block; padding: 6px 12px; border-radius: 50px; font-size: 12px; font-weight: 800; text-transform: uppercase; color: white; background-color: {color_estado}; }}
            
            .total-section {{ margin-top: 20px; text-align: center; background-color: #eff6ff; padding: 15px; border-radius: 8px; }}
            .total-label {{ color: #1e40af; font-size: 12px; font-weight: 700; text-transform: uppercase; }}
            .total-amount {{ color: #1e3a8a; font-size: 28px; font-weight: 800; margin-top: 5px; }}
            
            .footer {{ text-align: center; color: #9ca3af; font-size: 12px; padding: 20px; border-top: 1px solid #e5e7eb; background-color: #f9fafb; }}
        </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">⚽ DeportivaMas</div>
                    <div class="subtitle">Tu pasión, tu cancha.</div>
                </div>
                <div class="content">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <span class="badge">{texto_estado}</span>
                    </div>
                    <p class="greeting">¡Hola, {current_user.email.split('@')[0]}!</p>
                    <p class="message">Tu reserva está lista. Aquí tienes los detalles de tu partido.</p>
                    
                    <div class="ticket">
                        <div class="row">
                            <span class="label">Código Reserva</span>
                            <span class="value">#{nueva_reserva.id_reserva}</span>
                        </div>
                        <div class="row">
                            <span class="label">Cancha</span>
                            <span class="value">Cancha Principal #{cancha.id_cancha}</span>
                        </div>
                        <div class="row">
                            <span class="label">Fecha</span>
                            <span class="value">{horario.fecha}</span>
                        </div>
                        <div class="row">
                            <span class="label">Horario</span>
                            <span class="value">{horario.hora_inicio} - {horario.hora_fin}</span>
                        </div>
                    </div>
                    
                    <div class="total-section">
                        <div class="total-label">Total a Pagar</div>
                        <div class="total-amount">S/. {cancha.precio_hora}</div>
                    </div>
                </div>
                <div class="footer">
                    © 2025 DeportivaMas. <br>
                    Presenta este correo en recepción.
                </div>
            </div>
        </body>
        </html>
        """

        # Encolamos la tarea
        background_tasks.add_task(
            enviar_correo_brevo,
            current_user.email,
            "✅ Reserva Confirmada - DeportivaMas",
            html
        )
        # =================================

        return nueva_reserva
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {e}")

@app.get("/reservas/mi-historial", response_model=List[ReservaPublica])
def obtener_historial_cliente(db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    reservas = db.query(Reserva).filter(Reserva.id_usuario_fk == current_user.id).order_by(Reserva.fecha_creacion.desc()).all()
    return reservas

if __name__ == "__main__":
    print("Iniciando servidor de FastAPI en http://127.0.0.1:8002")
    uvicorn.run("servicio_reservas:app", host="127.0.0.1", port=8002, reload=True)