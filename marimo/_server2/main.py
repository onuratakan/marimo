# Copyright 2024 Marimo. All rights reserved.
from typing import Any

from starlette.applications import Starlette
from starlette.exceptions import HTTPException
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from marimo._server2.api.lifespans import LIFESPANS
from marimo._server2.api.router import ROUTES

# CORS
middleware = [
    Middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
]


# Convert exceptions to JSON responses
async def handle_error(request: Request, response: Any):
    if isinstance(response, HTTPException):
        return JSONResponse(
            {"detail": response.detail}, status_code=response.status_code
        )
    if isinstance(response, TypeError):
        return JSONResponse({"detail": str(response)}, status_code=500)
    if isinstance(response, Exception):
        return JSONResponse({"detail": str(response)}, status_code=500)
    return response


# Create app
app = Starlette(
    routes=ROUTES,
    middleware=middleware,
    lifespan=LIFESPANS,
    exception_handlers={
        Exception: handle_error,
        HTTPException: handle_error,
    },
)
