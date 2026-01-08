from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings
import os

CACHE_DIR = os.path.join(os.path.dirname(__file__), 'static', 'data')
os.makedirs(CACHE_DIR, exist_ok=True)
CACHE_DB_PATH = os.path.join(CACHE_DIR, 'stock_cache.db')

engine = create_engine(
    f'sqlite:///{CACHE_DB_PATH}',
    connect_args={'check_same_thread': False},
    echo=settings.DEBUG
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_cache_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
