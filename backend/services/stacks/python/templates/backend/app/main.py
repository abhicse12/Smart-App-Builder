import importlib
import pkgutil

from fastapi import APIRouter, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from starlette.exceptions import HTTPException

import app.routers as routers_package

app = FastAPI(title="Generated Application", redirect_slashes=False)


@app.exception_handler(HTTPException)
async def http_error(_: Request, error: HTTPException):
    """Every API error has the same shape: { "message": "..." }."""
    return JSONResponse(status_code=error.status_code, content={"message": error.detail})


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, error: RequestValidationError):
    first = error.errors()[0]
    field = ".".join(str(part) for part in first["loc"] if part != "body")
    return JSONResponse(status_code=400, content={"message": f"{field}: {first['msg']}"})


@app.get("/health")
def health():
    return {"status": "ok"}


# /api/tasks and /api/tasks/ both answer directly. A redirect would point at
# the backend's own address, which the browser cannot reach through the proxy.
def _add_slash_aliases(router: APIRouter) -> None:
    for route in list(router.routes):
        if not isinstance(route, APIRoute):
            continue

        path = route.path[len(router.prefix):]

        router.add_api_route(
            path[:-1] if path.endswith("/") else f"{path}/",
            route.endpoint,
            methods=list(route.methods),
            status_code=route.status_code,
            response_model=route.response_model,
            dependencies=route.dependencies,
            include_in_schema=False,
        )


# Every module in app/routers that defines "router" is registered
for module_info in pkgutil.iter_modules(routers_package.__path__):
    module = importlib.import_module(f"app.routers.{module_info.name}")
    _add_slash_aliases(module.router)
    app.include_router(module.router)
