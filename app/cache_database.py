from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import event
from app.config import settings
import os

CACHE_DIR = os.path.join(os.path.dirname(__file__), 'static', 'data')
os.makedirs(CACHE_DIR, exist_ok=True)
CACHE_DB_PATH = os.path.join(CACHE_DIR, 'stock_cache.db')

engine = create_engine(
    f'sqlite:///{CACHE_DB_PATH}',
    connect_args={'check_same_thread': False},
    echo=settings.DEBUG,
    pool_pre_ping=True
)

# 禁用 SQLite 的 datetime 自动类型检测，使用字符串处理
# 这样可以避免 SQLAlchemy 的 Cython 扩展解析问题
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """设置 SQLite 连接参数"""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_cache_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
