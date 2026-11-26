import sys

from backend.sheets import listar_leads, obter_lead
from backend.processamento_ia import processar_ia_do_lead


def reprocessar_erros():
    for lead in listar_leads():
        if lead.get("id") and lead.get("status_ia") == "Erro":
            processar_ia_do_lead(lead["id"])


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python -m backend.reprocessar_ia UUID")
        sys.exit(1)

    lead_id = sys.argv[1]
    lead = obter_lead(lead_id)

    if lead is None:
        print("Lead não encontrado.")
    elif lead["status_ia"] != "Erro":
        print("Este lead não está com status de erro.")
    else:
        sucesso = processar_ia_do_lead(lead_id)
        if sucesso:
            print("Lead reprocessado com sucesso!")
        else:
            print("Não foi possível reprocessar o lead.")