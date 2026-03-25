"""
Health check API route.

Provides a lightweight health endpoint for monitoring and
load balancer health probes.
"""

from fastapi import APIRouter

from app.schemas.common import APIResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=APIResponse,
    summary="Health check",
    description="Returns service health status for monitoring and probes.",
)
async def health_check() -> APIResponse:
    """
    Returns a simple health status response.

    Returns:
        APIResponse: Health status with service name.
    """
    return APIResponse(
        status="success",
        data={"service": "supply-chain-intelligence-engine", "status": "healthy"},
    )
