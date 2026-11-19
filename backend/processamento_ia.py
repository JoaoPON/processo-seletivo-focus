import logging

from backend.ia import classificar_lead
from backend.sheets import obter_lead, atualizar_lead

logger = logging.getLogger(__name__)


def processar_ia_do_lead(lead_id: str) -> bool:
    lead = obter_lead(lead_id)

    if lead is None:
        logger.error(f"Lead com ID {lead_id} não encontrado.")
        return False

    try:

        resultado = classificar_lead(lead["descricao"], lead["solucao_interesse"])

        dados_ia = {
            "prioridade_ia": resultado["prioridade"],
            "justificativa_ia": resultado["justificativa"],
            "sugestao_abordagem": resultado["sugestao_abordagem"],
            "status_ia": "Processado"
        }

        return atualizar_lead(lead_id, dados_ia)

    except Exception:
        logger.exception("Erro ao processar IA do lead %s", lead_id)

        try:
            atualizar_lead(lead_id, {"status_ia": "Erro"})
        except Exception:
            logger.exception("Não foi possível atualizar o status_ia do lead %s", lead_id)

        return False