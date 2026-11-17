import json

from backend.sheets import (
    salvar_lead, listar_leads, obter_lead, atualizar_lead, deletar_lead,
    salvar_interacao, listar_interacoes, obter_interacao, atualizar_interacao, deletar_interacao
)


def exibir(dados):
    print(json.dumps(dados, indent=2, ensure_ascii=False))


def menu():
    while True:
        print("\n" + "=" * 40)
        print("       TESTE CRUD - LEADFLOW")
        print("=" * 40)
        print("LEADS:")
        print("  1. Criar Lead")
        print("  2. Listar Leads")
        print("  3. Buscar Lead por ID")
        print("  4. Atualizar Lead")
        print("  5. Deletar Lead")
        print("-" * 40)
        print("INTERAÇÕES:")
        print("  6. Criar Interação")
        print("  7. Listar Interações")
        print("  8. Buscar Interação por ID")
        print("  9. Atualizar Interação")
        print(" 10. Deletar Interação")
        print("-" * 40)
        print("  0. Sair")

        opcao = input("\nEscolha uma opção: ").strip()

        try:
            if opcao == "1":
                print("\n[Enter usa valores padrão de teste]")
                dados = {
                    "empresa": input("Empresa [Empresa Teste]: ") or "Empresa Teste",
                    "nome_completo": input("Nome [João Silva]: ") or "João Silva",
                    "email": input("E-mail [joao@teste.com]: ") or "joao@teste.com",
                    "whatsapp": input("WhatsApp [11999999999]: ") or "11999999999",
                    "nicho": input("Nicho [Tecnologia]: ") or "Tecnologia",
                    "cidade": input("Cidade [São Paulo]: ") or "São Paulo",
                    "descricao": input("Descrição [Teste CRUD]: ") or "Teste CRUD",
                    "solucao_interesse": input("Solução [Automação]: ") or "Automação",
                }
                novo_id = salvar_lead(dados)
                print(f"\nLead criado com sucesso! ID: {novo_id}")

            elif opcao == "2":
                leads = listar_leads()
                print(f"\nTotal de leads: {len(leads)}")
                exibir(leads)

            elif opcao == "3":
                lead_id = input("ID do Lead: ").strip()
                lead = obter_lead(lead_id)
                exibir(lead if lead else "Lead não encontrado.")

            elif opcao == "4":
                lead_id = input("ID do Lead para atualizar: ").strip()
                campo = input("Nome da coluna (ex: status, cidade, nicho): ").strip()
                valor = input("Novo valor: ").strip()
                ok = atualizar_lead(lead_id, {campo: valor})
                print("\nAtualizado!" if ok else "\nLead não encontrado.")

            elif opcao == "5":
                lead_id = input("ID do Lead para deletar: ").strip()
                ok = deletar_lead(lead_id)
                print("\nLead removido!" if ok else "\nLead não encontrado.")

            elif opcao == "6":
                print("\n[Enter usa valores padrão ou deixa vazio]")
                dados = {
                    "id_lead": input("ID do Lead vinculado: ").strip(),
                    "acao": input("Ação [Ligação]: ") or "Ligação",
                    "pauta": input("Pauta [Qualificação inicial]: ") or "Qualificação inicial",
                    "responsavel": input("Responsável [SDR]: ") or "SDR",
                    "data_agendada": input("Data agendada (AAAA-MM-DD) []: ").strip(),
                    "hora_agendada": input("Hora agendada (HH:MM) []: ").strip(),
                    "data_realizada": input("Data realizada (AAAA-MM-DD) []: ").strip(),
                    "hora_realizada": input("Hora realizada (HH:MM) []: ").strip(),
                    "resultado": input("Resultado []: ").strip(),
                    "observacoes": input("Observações []: ").strip(),
                }
                novo_id = salvar_interacao(dados)
                print(f"\nInteração criada com sucesso! ID: {novo_id}")

            elif opcao == "7":
                filtro_lead = input("Filtrar por ID do Lead (Enter para listar todas): ").strip() or None
                interacoes = listar_interacoes(id_lead=filtro_lead)
                print(f"\nTotal de interações: {len(interacoes)}")
                exibir(interacoes)

            elif opcao == "8":
                interacao_id = input("ID da Interação: ").strip()
                interacao = obter_interacao(interacao_id)
                exibir(interacao if interacao else "Interação não encontrada.")

            elif opcao == "9":
                interacao_id = input("ID da Interação para atualizar: ").strip()
                campo = input("Nome da coluna (ex: data_realizada, resultado, observacoes): ").strip()
                valor = input("Novo valor: ").strip()
                ok = atualizar_interacao(interacao_id, {campo: valor})
                print("\nInteração atualizada!" if ok else "\nInteração não encontrada.")

            elif opcao == "10":
                interacao_id = input("ID da Interação para deletar: ").strip()
                ok = deletar_interacao(interacao_id)
                print("\nInteração removida!" if ok else "\nInteração não encontrada.")

            elif opcao == "0":
                print("Encerrando...")
                break

            else:
                print("Opção inválida.")

        except Exception as erro:
            print(f"\nErro durante a execução: {erro}")


if __name__ == "__main__":
    menu()