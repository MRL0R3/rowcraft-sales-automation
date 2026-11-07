"""Local-only FastAPI demonstration API. Not intended for public deployment."""

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

from rowcraft.csv_ingest import MAX_BYTES, CSVInputError, parse_orders
from rowcraft.metrics import calculate_report
from rowcraft.models import AnalyzeResponse, ErrorResponse

app = FastAPI(
    title="Rowcraft local analysis API",
    version="1.0.0",
    description="Local CSV analysis for development demos.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "rowcraft-local-api"}


@app.post(
    "/api/v1/analyze",
    response_model=AnalyzeResponse,
    responses={400: {"model": ErrorResponse}, 413: {"model": ErrorResponse}},
)
async def analyze(file: UploadFile = File(...)) -> AnalyzeResponse | JSONResponse:  # noqa: B008
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        return JSONResponse(
            status_code=413,
            content=ErrorResponse(detail="CSV exceeds the 5 MB upload limit.").model_dump(),
        )
    try:
        lines, duplicates = parse_orders(data)
        return AnalyzeResponse(report=calculate_report(lines, duplicates))
    except CSVInputError as exc:
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(detail=str(exc), issues=exc.issues).model_dump(),
        )
