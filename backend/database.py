"""
Manejador de base de datos y sesiones SQLAlchemy para el backend de producción.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from .config import DATABASE_URL, STORAGE_DIR
from .models import Base

# Asegurar que el directorio de almacenamiento existe
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

SessionFactory = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)
SessionLocal = scoped_session(SessionFactory)


def init_db():
    """Crea las tablas en la base de datos si no existen."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Generador de contexto de sesión para inyección de dependencias o scripts."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
