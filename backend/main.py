#uvicorn --reload backend.main:app

import logging
import os

from fastapi import FastAPI, HTTPException, BackgroundTasks
import backend.schemas as schemas
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import backend.sheets as sheets
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


@app.get("/api/listas")
def rota_obter_listas():
    try:
        return sheets.obter_listas()
    except Exception:
        logger.exception("Erro ao carregar listas")
        raise HTTPException(status_code=500, detail="Não foi possível carregar as listas.")


@app.post("/api/webhooks/leads")
def receber_lead(lead: schemas.LeadWebhookSchema, background_tasks: BackgroundTasks):

    dados = lead.model_dump()

    dados["origem"] = "SITE"


    try:
        lead_id = sheets.salvar_lead(dados)


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
        leads = sheets.listar_leads()
        return list(reversed(leads))  # Mostra os mais recentes primeiro
    except Exception:
        logger.exception("Erro ao listar leads")
        raise HTTPException(status_code=500, detail="Não foi possível carregar os leads.")


@app.post("/api/leads")
def rota_criar_lead(lead: schemas.LeadFrontendSchema, background_tasks: BackgroundTasks):
    dados = lead.model_dump()
    dados["origem"] = "MANUAL"

    try:
        lead_id = sheets.salvar_lead(dados)
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


@app.patch("/api/leads/{lead_id}")
def rota_atualizar_lead(lead_id: str, lead: schemas.LeadUpdateSchema):
    dados = lead.model_dump(exclude_unset=True)
    try:
        sheets.atualizar_lead(lead_id, dados)
        return {"mensagem": "Lead atualizado com sucesso!"}
    except Exception:
        logger.exception("Erro ao atualizar lead no Google Sheets")
        raise HTTPException(status_code=500, detail="Não foi possível atualizar o lead.")


@app.get("/api/interacoes")
def rota_listar_todas_interacoes():
    try:
        interacoes = sheets.listar_interacoes()
        return list(reversed(interacoes))
    except Exception:
        logger.exception("Erro ao listar todas as interações")
        raise HTTPException(status_code=500, detail="Não foi possível carregar as interações.")


@app.get("/api/leads/{id}/interacoes")
def rota_listar_interacoes(id: str):
    try:
        interacoes = sheets.listar_interacoes(id)
        return list(reversed(interacoes)) # Mostra os mais recentes primeiro
    except Exception:
        logger.exception("Erro ao listar interações do lead %s", id)
        raise HTTPException(status_code=500, detail="Não foi possível carregar as interações do lead.")


@app.post("/api/interacoes")
def rota_criar_interacao(interacao: schemas.InteracaoCreateSchema):
    dados = interacao.model_dump()
    try:
        interacao_id = sheets.salvar_interacao(dados)
        return {
            "mensagem": "Interação cadastrada com sucesso!",
            "id": interacao_id
        }
    except Exception:
        logger.exception("Erro ao salvar interação no Google Sheets")
        raise HTTPException(status_code=500, detail="Não foi possível salvar a interação.")


@app.patch("/api/interacoes/{interacao_id}")
def rota_atualizar_interacao(interacao_id: str, interacao: schemas.InteracaoUpdateSchema):
    dados = interacao.model_dump(exclude_unset=True)
    try:
        sheets.atualizar_interacao(interacao_id, dados)
        return {"mensagem": "Interação atualizada com sucesso!"}
    except Exception:
        logger.exception("Erro ao atualizar interação no Google Sheets")
        raise HTTPException(status_code=500, detail="Não foi possível atualizar a interação.")


@app.post("/api/leads/{lead_id}/reprocessar-ia")
def rota_reprocessar_ia(lead_id: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(processar_ia_do_lead, lead_id)
    return {"mensagem": "Reprocessamento da IA iniciado.", "id": lead_id}


if os.path.exists("frontend"):
    app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")