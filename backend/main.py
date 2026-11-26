# uvicorn --reload backend.main:app

import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import backend.schemas as schemas
import backend.sheets as sheets
from backend.processamento_ia import processar_ia_do_lead
from backend.login import router as login_router, exigir_login
from backend.sincronizar_planilha import sincronizar_leads_manuais
from backend.reprocessar_ia import reprocessar_erros

logger = logging.getLogger(__name__)


async def loop_rotinas_background():
    while True:
        try:
            await asyncio.to_thread(sincronizar_leads_manuais)
            await asyncio.to_thread(reprocessar_erros)
        except Exception:
            logger.exception("Erro na execução periódica das rotinas de planilha/IA")
        await asyncio.sleep(300)  # Executa a cada 5 minutos


@asynccontextmanager
async def lifespan(app: FastAPI):
    tarefa = asyncio.create_task(loop_rotinas_background())
    try:
        yield
    finally:
        tarefa.cancel()


app = FastAPI(title="PS-Focus", lifespan=lifespan)

app.include_router(login_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Endpoints Públicos

@app.get("/health")
def health():
    return {"status": "ok"}


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
        "empresa": dados["empresa"],
    }


# Endpoints Protegidos

@app.get("/api/listas")
def rota_obter_listas(usuario=Depends(exigir_login)):
    try:
        return sheets.obter_listas()
    except Exception:
        logger.exception("Erro ao carregar listas")
        raise HTTPException(status_code=500, detail="Não foi possível carregar as listas.")


@app.get("/api/leads")
def rota_listar_leads(usuario=Depends(exigir_login)):
    try:
        leads = sheets.listar_leads()
        return list(reversed(leads))  # Mostra os mais recentes primeiro
    except Exception:
        logger.exception("Erro ao listar leads")
        raise HTTPException(status_code=500, detail="Não foi possível carregar os leads.")


@app.post("/api/leads")
def rota_criar_lead(
    lead: schemas.LeadFrontendSchema,
    background_tasks: BackgroundTasks,
    usuario=Depends(exigir_login),
):
    dados = lead.model_dump()
    dados["origem"] = "MANUAL"
    dados["responsavel_sdr"] = usuario["nome"]

    try:
        lead_id = sheets.salvar_lead(dados)
    except Exception:
        logger.exception("Erro ao salvar lead manual no Google Sheets")
        raise HTTPException(status_code=500, detail="Não foi possível salvar o lead.")

    background_tasks.add_task(processar_ia_do_lead, lead_id)

    return {
        "mensagem": "Lead cadastrado com sucesso!",
        "id": lead_id,
        "empresa": dados["empresa"],
    }


@app.patch("/api/leads/{lead_id}")
def rota_atualizar_lead(
    lead_id: str,
    lead: schemas.LeadUpdateSchema,
    usuario=Depends(exigir_login),
):
    dados = lead.model_dump(exclude_unset=True)
    try:
        sheets.atualizar_lead(lead_id, dados)
        return {"mensagem": "Lead atualizado com sucesso!"}
    except Exception:
        logger.exception("Erro ao atualizar lead no Google Sheets")
        raise HTTPException(status_code=500, detail="Não foi possível atualizar o lead.")


@app.get("/api/interacoes")
def rota_listar_todas_interacoes(usuario=Depends(exigir_login)):
    try:
        interacoes = sheets.listar_interacoes()
        return list(reversed(interacoes))
    except Exception:
        logger.exception("Erro ao listar todas as interações")
        raise HTTPException(status_code=500, detail="Não foi possível carregar as interações.")


@app.get("/api/leads/{id}/interacoes")
def rota_listar_interacoes(id: str, usuario=Depends(exigir_login)):
    try:
        interacoes = sheets.listar_interacoes(id)
        return list(reversed(interacoes))  # Mostra os mais recentes primeiro
    except Exception:
        logger.exception("Erro ao listar interações do lead %s", id)
        raise HTTPException(status_code=500, detail="Não foi possível carregar as interações do lead.")


@app.post("/api/interacoes")
def rota_criar_interacao(
    interacao: schemas.InteracaoCreateSchema,
    usuario=Depends(exigir_login),
):
    dados = interacao.model_dump()
    try:
        interacao_id = sheets.salvar_interacao(dados)
        return {
            "mensagem": "Interação cadastrada com sucesso!",
            "id": interacao_id,
        }
    except Exception:
        logger.exception("Erro ao salvar interação no Google Sheets")
        raise HTTPException(status_code=500, detail="Não foi possível salvar a interação.")


@app.patch("/api/interacoes/{interacao_id}")
def rota_atualizar_interacao(
    interacao_id: str,
    interacao: schemas.InteracaoUpdateSchema,
    usuario=Depends(exigir_login),
):
    dados = interacao.model_dump(exclude_unset=True)
    try:
        sheets.atualizar_interacao(interacao_id, dados)
        return {"mensagem": "Interação atualizada com sucesso!"}
    except Exception:
        logger.exception("Erro ao atualizar interação no Google Sheets")
        raise HTTPException(status_code=500, detail="Não foi possível atualizar a interação.")


if os.path.exists("frontend"):
    app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")