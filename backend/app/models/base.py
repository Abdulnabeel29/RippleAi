"""
SQLAlchemy declarative base.

All ORM models inherit from this Base class so that table
metadata is centralized and discoverable by create_tables().
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

    pass
