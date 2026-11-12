from backend.sheets import salvar_lead, atualizar_lead, deletar_lead

print("1. Criando lead de teste na planilha...")
novo_id = salvar_lead({
    "nome_completo": "Carlos Teste",
    "empresa": "Empresa Teste",
    "email": "carlos@teste.com",
    "whatsapp": "11988887777",
    "descricao": "Testando funções do sheets.py",
    "solucao_interesse": "CRM"
})
print(f"Lead criado. ID gerado: {novo_id}\n")

print("2. Atualizando status, nicho e cidade desse lead...")
sucesso = atualizar_lead(novo_id, {
    "status": "Em contato",
    "nicho": "Tecnologia",
    "cidade": "Curitiba"
})

if sucesso:
    print("Sucesso.")
else:
    print("Falha: ID não encontrado na planilha.")

print("3. Deletando o lead...")
sucesso = deletar_lead(novo_id)

if sucesso:
    print("Sucesso.")
else:
    print("Falha: ID não encontrado na planilha.")


