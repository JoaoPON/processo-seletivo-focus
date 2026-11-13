import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List
import gspread
from dotenv import load_dotenv

load_dotenv()

CREDENCIAL = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "credentials/service_account.json")
PLANILHA_ID = os.getenv("SPREADSHEET_ID")

COLUNAS_LEADS = [
    "id", "criado_em", "empresa", "nome_completo", "email", "whatsapp",
    "nicho", "cidade", "descricao", "solucao_interesse", "origem", "status",
    "responsavel_sdr", "prioridade_ia", "indicador_intencao", "justificativa_ia",
    "sugestao_abordagem", "status_ia"
]




def conectar_planilha():
    cliente = gspread.service_account(filename=CREDENCIAL)
    return cliente.open_by_key(PLANILHA_ID)

def linha_para_dict(linha: list, colunas: list) -> dict:
    dados = {}
    for id, chave in enumerate(colunas):
        dados[chave] = linha[id] if id < len(linha) else ""
    return dados




def salvar_lead(dados: dict) -> str:
    planilha = conectar_planilha()
    aba = planilha.worksheet("Leads")

    lead_id = dados.get("id") or str(uuid.uuid4())
    criado_em = dados.get("criado_em") or datetime.now(timezone.utc).isoformat(timespec="seconds")

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

    aba.append_row(linha, value_input_option="RAW")
    return lead_id


def atualizar_lead(lead_id: str, dados_novos: dict) -> bool:
    planilha = conectar_planilha()
    aba = planilha.worksheet("Leads")

    celula = aba.find(lead_id, in_column=1)
    if not celula:
        return False

    linha_num = celula.row
    linha_atual = aba.row_values(linha_num)

    nova_linha = [
        lead_id,
        linha_atual[1] if len(linha_atual) > 1 else "",
        dados_novos.get("empresa", linha_atual[2] if len(linha_atual) > 2 else ""),
        dados_novos.get("nome_completo", linha_atual[3] if len(linha_atual) > 3 else ""),
        dados_novos.get("email", linha_atual[4] if len(linha_atual) > 4 else ""),
        dados_novos.get("whatsapp", linha_atual[5] if len(linha_atual) > 5 else ""),
        dados_novos.get("nicho", linha_atual[6] if len(linha_atual) > 6 else ""),
        dados_novos.get("cidade", linha_atual[7] if len(linha_atual) > 7 else ""),
        dados_novos.get("descricao", linha_atual[8] if len(linha_atual) > 8 else ""),
        dados_novos.get("solucao_interesse", linha_atual[9] if len(linha_atual) > 9 else ""),
        dados_novos.get("origem", linha_atual[10] if len(linha_atual) > 10 else "SITE"),
        dados_novos.get("status", linha_atual[11] if len(linha_atual) > 11 else "Novo"),
        dados_novos.get("responsavel_sdr", linha_atual[12] if len(linha_atual) > 12 else "SITE"),
        dados_novos.get("prioridade_ia", linha_atual[13] if len(linha_atual) > 13 else ""),
        dados_novos.get("indicador_intencao", linha_atual[14] if len(linha_atual) > 14 else ""),
        dados_novos.get("justificativa_ia", linha_atual[15] if len(linha_atual) > 15 else ""),
        dados_novos.get("sugestao_abordagem", linha_atual[16] if len(linha_atual) > 16 else ""),
        dados_novos.get("status_ia", linha_atual[17] if len(linha_atual) > 17 else "Pendente")
    ]

    aba.update(range_name=f"A{linha_num}:R{linha_num}", values=[nova_linha])
    return True


def deletar_lead(lead_id: str) -> bool:
    planilha = conectar_planilha()
    aba = planilha.worksheet("Leads")
    celula = aba.find(lead_id, in_column=1)
    if not celula:
        return False
    
    aba.delete_rows(celula.row)
    return True


def obter_lead(lead_id: str) -> Optional[dict]:
    planilha = conectar_planilha()
    aba = planilha.worksheet("Leads")
    celula = aba.find(lead_id, in_column=1)
    if not celula:
        return None

    linha = aba.row_values(celula.row)
    return linha_para_dict(linha, COLUNAS_LEADS)


def listar_leads() -> List[dict]:
    planilha = conectar_planilha()
    aba = planilha.worksheet("Leads")
    todas_linhas = aba.get_all_values()

    # Ignora o cabeçalho
    if len(todas_linhas) <= 1:
        return []

    # Ignora o cabeçalho
    return [linha_para_dict(linha, COLUNAS_LEADS) for linha in todas_linhas[1:]]