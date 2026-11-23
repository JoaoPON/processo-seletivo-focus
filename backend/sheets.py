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
    "responsavel_sdr", "prioridade_ia", "justificativa_ia",
    "sugestao_abordagem", "status_ia"
]

COLUNAS_INTERACOES = [
    "id", "id_lead", "acao", "pauta", "responsavel",  "data_agendada",
    "hora_agendada", "data_realizada", "hora_realizada", "resultado", "observacoes"
]

COLUNAS_LISTAS = [
    "nichos", "cidades", "membros", "origem", "status",
    "acoes", "prioridade_ia", "status_ia", "resultado"
]


def conectar_planilha():
    cliente = gspread.service_account(filename=CREDENCIAL)
    return cliente.open_by_key(PLANILHA_ID)


def linha_para_dict(linha: list, colunas: list) -> dict:
    return {
        chave: linha[idx] if idx < len(linha) else ""
        for idx, chave in enumerate(colunas)
    }


def obter_lista(nome_coluna: str) -> List[str]:
    if nome_coluna not in COLUNAS_LISTAS:
        raise ValueError(f"Coluna '{nome_coluna}' inválida. Use uma de: {COLUNAS_LISTAS}")

    planilha = conectar_planilha()
    aba = planilha.worksheet("Listas")

    indice_coluna = COLUNAS_LISTAS.index(nome_coluna) + 1
    valores = aba.col_values(indice_coluna)

    return [item.strip() for item in valores[1:] if item.strip()]


def obter_listas() -> dict:
    planilha = conectar_planilha()
    aba = planilha.worksheet("Listas")
    todas_linhas = aba.get_all_values()

    listas = {col: [] for col in COLUNAS_LISTAS}
    if len(todas_linhas) <= 1:
        return listas

    for linha in todas_linhas[1:]:
        for idx, col in enumerate(COLUNAS_LISTAS):
            if idx < len(linha) and linha[idx].strip():
                listas[col].append(linha[idx].strip())

    return listas


#  Funções Genéricas

def criar_registro(nome_aba: str, colunas: list, dados: dict) -> str:
    planilha = conectar_planilha()
    aba = planilha.worksheet(nome_aba)

    registro_id = dados.get("id") or str(uuid.uuid4())
    dados_completos = {**dados, "id": registro_id}

    linha = [str(dados_completos.get(col, "")) for col in colunas]
    aba.append_row(linha, value_input_option="RAW")
    return registro_id


def listar_registros(nome_aba: str, colunas: list) -> List[dict]:
    planilha = conectar_planilha()
    aba = planilha.worksheet(nome_aba)
    todas_linhas = aba.get_all_values()

    if len(todas_linhas) <= 1:
        return []

    return [linha_para_dict(linha, colunas) for linha in todas_linhas[1:]]


def obter_registro(nome_aba: str, colunas: list, registro_id: str) -> Optional[dict]:
    planilha = conectar_planilha()
    aba = planilha.worksheet(nome_aba)
    celula = aba.find(registro_id, in_column=1)

    if not celula:
        return None

    linha = aba.row_values(celula.row)
    return linha_para_dict(linha, colunas)


def atualizar_registro(nome_aba: str, colunas: list, registro_id: str, dados_novos: dict) -> bool:
    planilha = conectar_planilha()
    aba = planilha.worksheet(nome_aba)
    celula = aba.find(registro_id, in_column=1)

    if not celula:
        return False

    linha_num = celula.row
    registro_atual = linha_para_dict(aba.row_values(linha_num), colunas)

    for chave, valor in dados_novos.items():
        if chave in registro_atual and chave != "id" and valor is not None:
            registro_atual[chave] = str(valor)

    nova_linha = [registro_atual.get(col, "") for col in colunas]
    ultima_coluna = chr(64 + len(colunas))

    aba.update(range_name=f"A{linha_num}:{ultima_coluna}{linha_num}", values=[nova_linha])
    return True


def deletar_registro(nome_aba: str, registro_id: str) -> bool:
    planilha = conectar_planilha()
    aba = planilha.worksheet(nome_aba)
    celula = aba.find(registro_id, in_column=1)

    if not celula:
        return False

    aba.delete_rows(celula.row)
    return True




# CRUD LEADS

def salvar_lead(dados: dict) -> str:
    dados_lead = {
        "criado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "origem": "SITE",
        "status": "Novo",
        "responsavel_sdr": "",
        "status_ia": "Pendente",
        **dados
    }
    return criar_registro("Leads", COLUNAS_LEADS, dados_lead)


def listar_leads() -> List[dict]:
    return listar_registros("Leads", COLUNAS_LEADS)


def obter_lead(lead_id: str) -> Optional[dict]:
    return obter_registro("Leads", COLUNAS_LEADS, lead_id)


def atualizar_lead(lead_id: str, dados_novos: dict) -> bool:
    return atualizar_registro("Leads", COLUNAS_LEADS, lead_id, dados_novos)


def deletar_lead(lead_id: str) -> bool:
    return deletar_registro("Leads", lead_id)




# CRUD INTERAÇÕES

def salvar_interacao(dados: dict) -> str:
    return criar_registro("Interacoes", COLUNAS_INTERACOES, dados)


def listar_interacoes(id_lead: Optional[str] = None) -> List[dict]:
    interacoes = listar_registros("Interacoes", COLUNAS_INTERACOES)
    if id_lead:
        return [item for item in interacoes if item["id_lead"] == id_lead]
    return interacoes


def obter_interacao(interacao_id: str) -> Optional[dict]:
    return obter_registro("Interacoes", COLUNAS_INTERACOES, interacao_id)


def atualizar_interacao(interacao_id: str, dados_novos: dict) -> bool:
    return atualizar_registro("Interacoes", COLUNAS_INTERACOES, interacao_id, dados_novos)


def deletar_interacao(interacao_id: str) -> bool:
    return deletar_registro("Interacoes", interacao_id)