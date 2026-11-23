#uvicorn --reload backend.main:app

import logging
import os

from fastapi import FastAPI, HTTPException, BackgroundTasks
from backend.schemas import LeadWebhookSchema, LeadFrontendSchema
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.sheets import salvar_lead, listar_leads
from backend.processamento_ia import processar_ia_do_lead

app = FastAPI(title="PS-Focus")

logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/api/leads")
def rota_listar_leads():
    try:
        leads = listar_leads()
        return list(reversed(leads))  # Mostra os mais recentes primeiro
    except Exception:
        logger.exception("Erro ao listar leads")
        raise HTTPException(status_code=500, detail="Não foi possível carregar os leads.")


@app.post("/api/leads")
def rota_criar_lead(lead: LeadFrontendSchema, background_tasks: BackgroundTasks):
    dados = lead.model_dump()
    dados["origem"] = "MANUAL"

    try:
        lead_id = salvar_lead(dados)
    except Exception:
        logger.exception("Erro ao salvar lead manual no Google Sheets")
        raise HTTPException(status_code=500, detail="Não foi possível salvar o lead.")

    # Roda a qualificação da IA em segundo plano sem travar a tela
    background_tasks.add_task(processar_ia_do_lead, lead_id)

    return {
        "mensagem": "Lead cadastrado com sucesso!",
        "id": lead_id,
        "empresa": dados["empresa"]
    }


if os.path.exists("frontend"):
    app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")