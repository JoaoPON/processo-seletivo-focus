import backend.sheets as sheets

print("1. Criando dois leads de teste na planilha...")
novo_id = sheets.salvar_lead({
    "nome_completo": "Carlos Teste",
    "empresa": "Empresa Teste",
    "email": "carlos@teste.com",
    "whatsapp": "11988887777",
    "descricao": "Testando funções do sheets.py",
    "solucao_interesse": "CRM"
})
novo_id2 = sheets.salvar_lead({
    "nome_completo": "Maria Teste",
    "empresa": "Empresa Teste",
    "email": "maria@teste.com",
    "whatsapp": "11988887777",
    "descricao": "Testando funções do sheets.py",
    "solucao_interesse": "CRM"
})
print(f"Leads criados. IDs gerados: {novo_id}, {novo_id2}\n")

print("2. Atualizando status, nicho e cidade desse lead...")
sucesso = sheets.atualizar_lead(novo_id, {
    "status": "Em contato",
    "nicho": "Tecnologia",
    "cidade": "Rio das Ostras"
})

if sucesso:
    print("Sucesso.\n")
else:
    print("Falha: ID não encontrado na planilha.\n")


print("3. Obter informações do lead...")
lead_info = sheets.obter_lead(novo_id)
if lead_info:
    print(f"Informações do lead:\n{lead_info}\n")
else:
    print("Falha: ID não encontrado na planilha.\n")

if lead_info:
    print("Sucesso.\n")
else:
    print("Falha: Lead não encontrado na planilha.\n")

print("4. Listar todos os leads...")
leads = sheets.listar_leads()
for lead in leads:
    print(lead)

print("5. Deletando o lead...")
sucesso = sheets.deletar_lead(lead_info['id'])

if sucesso:
    print("Sucesso.")
else:
    print("Falha: ID não encontrado na planilha.")


