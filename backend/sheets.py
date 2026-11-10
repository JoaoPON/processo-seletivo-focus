import os
import uuid
from datetime import datetime, timezone
import gspread
from dotenv import load_dotenv

load_dotenv()

CREDENCIAL = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "credentials/service_account.json")
PLANILHA_ID = os.getenv("SPREADSHEET_ID")

def conectar_planilha():
    cliente = gspread.service_account(filename=CREDENCIAL)
    return cliente.open_by_key(PLANILHA_ID)

def salvar_lead(dados: dict) -> str:
    planilha = conectar_planilha()
    aba_leads = planilha.worksheet("Leads")

    lead_id = str(uuid.uuid4())
    criado_em = datetime.now(timezone.utc).isoformat(timespec="seconds")

    linha = [
        lead_id,
        criado_em,
        dados.get("empresa", ""),
        dados.get("nome_completo", ""),
        dados.get("email", ""),
        dados.get("whatsapp", ""),
        dados.get("nicho", ""),
        dados.get("cidade", ""),
        dados.get("descricao", ""),
        dados.get("solucao_interesse", ""),
        dados.get("origem", "SITE"),
        dados.get("status", "Novo"),
        dados.get("responsavel_sdr", "SITE"),
        dados.get("prioridade_ia", ""),
        dados.get("indicador_intencao", ""),
        dados.get("justificativa_ia", ""),
        dados.get("sugestao_abordagem", ""),
        dados.get("status_ia", "Pendente")
    ]

    aba_leads.append_row(linha, value_input_option="RAW")
    return lead_id