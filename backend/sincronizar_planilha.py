import logging
import uuid
from datetime import datetime, timezone

from backend.sheets import conectar_planilha, COLUNAS_LEADS, linha_para_dict
from backend.processamento_ia import processar_ia_do_lead

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def sincronizar_leads_manuais() -> None:
    planilha = conectar_planilha()
    aba = planilha.worksheet("Leads")
    todas_linhas = aba.get_all_values()

    if len(todas_linhas) <= 1:
        return

    ultima_coluna = chr(64 + len(COLUNAS_LEADS))
    ids_para_ia = []

    for idx_linha, linha in enumerate(todas_linhas[1:], start=2):
        if not any(cel.strip() for cel in linha):
            continue

        registro = linha_para_dict(linha, COLUNAS_LEADS)
        alterado = False

        if not registro["id"].strip():
            registro["id"] = str(uuid.uuid4())
            alterado = True

        if not registro["criado_em"].strip():
            registro["criado_em"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            alterado = True

        if not registro["origem"].strip():
            registro["origem"] = "PLANILHA"
            alterado = True

        if not registro["status"].strip():
            registro["status"] = "Novo"
            alterado = True

        status_ia = registro["status_ia"].strip()
        if not status_ia:
            registro["status_ia"] = "Pendente"
            status_ia = "Pendente"
            alterado = True

        if alterado:
            nova_linha = [registro.get(col, "") for col in COLUNAS_LEADS]
            aba.update(range_name=f"A{idx_linha}:{ultima_coluna}{idx_linha}", values=[nova_linha])
            logger.info("Linha %d normalizada (ID: %s).", idx_linha, registro["id"])

        if status_ia == "Pendente":
            ids_para_ia.append(registro["id"])

    for lead_id in ids_para_ia:
        processar_ia_do_lead(lead_id)


if __name__ == "__main__":
    sincronizar_leads_manuais()