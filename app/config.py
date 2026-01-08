from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DB_HOST: str = "mysql.sqlpub.com"
    DB_PORT: int = 3306
    DB_USER: str = "chase_zhang"
    DB_PASSWORD: str = ""  # Set via environment variable
    DB_NAME: str = "stock_review"

    APP_NAME: str = "Stock Dashboard"
    APP_ENV: str = "production"
    DEBUG: bool = False

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4&connect_timeout=10"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
