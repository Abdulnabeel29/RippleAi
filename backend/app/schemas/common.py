"""
Shared Pydantic schemas for standardized API responses.

All API endpoints return data wrapped in this common envelope
to ensure consistent response structure across the system.
"""

from typing import Any, Optional

from pydantic import BaseModel


class APIResponse(BaseModel):
    """
    Standard API response wrapper.

    Attributes:
        status: Response status string ("success" or "error").
        data: Response payload. Can be any serializable type.
        message: Optional human-readable message for context.
    """

    status: str = "success"
    data: Optional[Any] = None
    message: Optional[str] = None
