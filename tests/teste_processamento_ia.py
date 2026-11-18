from backend.sheets import salvar_lead, obter_lead
from backend.processamento_ia import processar_ia_do_lead



dados = {
    "empresa": "Empresa Teste IA",
    "nome_completo": "Cliente Fictício",
    "email": "teste@example.com",
    "whatsapp": "00000000000",
    "descricao": "Precisamos automatizar o atendimento comercial para reduzir atrasos.",
    "solucao_interesse": "Automação de Processos"
}

lead_id = salvar_lead(dados)

print("Lead cadastrado!")
print("UUID:", lead_id)

sucesso = processar_ia_do_lead(lead_id)

print("IA processada com sucesso?", sucesso)


lead_atualizado = obter_lead(lead_id)

print("\nResultado salvo na planilha:")
print("Prioridade:", lead_atualizado["prioridade_ia"])
print("Justificativa:", lead_atualizado["justificativa_ia"])
print("Abordagem:", lead_atualizado["sugestao_abordagem"])
print("Status IA:", lead_atualizado["status_ia"])