from unittest.mock import patch
from fastapi import HTTPException

from backend.main import receber_lead
from backend.schemas import LeadWebhookSchema


lead = LeadWebhookSchema(
    nome_completo="Ana Teste",
    empresa="Empresa Fictícia",
    email="ana@exemplo.com",
    whatsapp="21999999999",
    descricao="Teste de erro do webhook",
    solucao_interesse="Automação"
)



with patch("backend.main.salvar_lead", side_effect=Exception("Falha simulada")):
    try:
        receber_lead(lead)

    except HTTPException as erro:
        print("Código HTTP:", erro.status_code)
        print("Mensagem:", erro.detail)
