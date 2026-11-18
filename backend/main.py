#uvicorn --reload backend.main:app

import logging

from fastapi import FastAPI, HTTPException, BackgroundTasks
from backend.schemas import LeadWebhookSchema
from backend.sheets import salvar_lead
from backend.processamento_ia import processar_ia_do_lead

app = FastAPI(title="PS-Focus")


logger = logging.getLogger(__name__)


@app.get("/health")
def health():
    return {"status": "ok"}



@app.post("/api/webhooks/leads")
def receber_lead(lead: LeadWebhookSchema, background_tasks: BackgroundTasks):

    dados = lead.model_dump()

    dados["origem"] = "SITE"


    try:
        lead_id = salvar_lead(dados)


    except Exception:
        logger.exception("Erro ao salvar lead no Google Sheets")

        raise HTTPException(status_code=500, detail="Não foi possível salvar o lead.")


    background_tasks.add_task(processar_ia_do_lead, lead_id)


    return {
        "mensagem": "Lead recebido com sucesso!",
        "id": lead_id,
        "empresa": dados["empresa"]
    }