"""Authentication guard for server-side research database endpoints."""

import os
import secrets
from typing import Annotated, Optional

from fastapi import Header, HTTPException, status


def require_research_admin_token(
    x_research_admin_token: Annotated[
        Optional[str], Header(alias="X-Research-Admin-Token")
    ] = None,
) -> None:
    """Fail closed unless the request supplies the configured admin token."""

    configured_token = os.environ.get("RESEARCH_ADMIN_TOKEN")
    if not configured_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Research API authentication is not configured",
        )

    if not x_research_admin_token or not secrets.compare_digest(
        x_research_admin_token, configured_token
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing research admin token",
        )

