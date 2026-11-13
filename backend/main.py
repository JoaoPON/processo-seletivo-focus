#uvicorn --reload backend.main:app

import logging

from fastapi import FastAPI, HTTPException
from backend.schemas import LeadWebhookSchema
from backend.sheets import salvar_lead

app = FastAPI(title="LeadFlow")


logger = logging.getLogger(__name__)


@app.get("/health")
def health():
    return {"status": "ok"}



@app.post("/api/webhooks/leads")
def receber_lead(lead: LeadWebhookSchema):

    dados = lead.model_dump()

    dados["origem"] = "SITE"


    try:
        lead_id = salvar_lead(dados)


    except Exception:
        logger.exception("Erro ao salvar lead no Google Sheets")

        raise HTTPException(status_code=500, detail="Não foi possível salvar o lead.")


    return {
        "mensagem": "Lead recebido com sucesso!",
        "id": lead_id,
        "empresa": dados["empresa"]
    }