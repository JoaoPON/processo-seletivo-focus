#uvicorn --reload backend.main:app

from fastapi import FastAPI

app = FastAPI(title="LeadFlow")


@app.get("/health")
def health():
    return {"status": "ok"}