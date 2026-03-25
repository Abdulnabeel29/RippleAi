"""
Application configuration management.

Loads and validates environment variables using Pydantic Settings.
Provides a single access point for all configuration values.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    Attributes:
        APP_ENV: Current environment (development, staging, production).
        LOG_LEVEL: Logging verbosity level.
        DATABASE_URL: Async PostgreSQL connection string.
        OPENAI_API_KEY: API key for OpenAI event detection.
        NEWS_API_KEY: API key for NewsAPI news fetching.
        NEWS_API_BASE_URL: Base URL for the NewsAPI service.
        OPENAI_MODEL: OpenAI model to use for event extraction.
    """

    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str

    # External APIs
    GEMINI_API_KEY: str
    NEWS_API_KEY: str
    NEWS_API_BASE_URL: str = "https://newsapi.org/v2"
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # Graph Database
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Returns a cached singleton instance of application settings.

    Returns:
        Settings: Validated application configuration.
    """
    return Settings()
