from fastapi import APIRouter # type: ignore

router = APIRouter()

@router.get("/")
@router.get("")  # Also handle /health without trailing slash
async def health():
    return {"ok": True, "status": "healthy"}
