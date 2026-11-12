#uvicorn --reload backend.main:app

from fastapi import FastAPI

app = FastAPI(title="PS-Focus")


@app.get("/health")
def health():
    return {"status": "ok"}