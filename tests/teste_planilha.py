"""
    Teste de conexão com a planilha.
    python test/teste_planilha.py            # testa e apaga a linha de teste
    python test/teste_planilha.py --manter   # testa e deixa a linha na planilha
"""
import os
import sys
import uuid
from datetime import datetime, timezone

import gspread
from dotenv import load_dotenv

load_dotenv()

CREDENCIAL = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "credentials/service_account.json")
PLANILHA_ID = os.getenv("SPREADSHEET_ID")

def erro(mensagem):
    print(f"\nFALHOU: {mensagem}")
    sys.exit(1)


def main():
    manter = "--manter" in sys.argv

    if not PLANILHA_ID:
        erro("SPREADSHEET_ID não está no .env.")
    if not os.path.exists(CREDENCIAL):
        erro(f"arquivo de credencial não encontrado em '{CREDENCIAL}'.")

    print("1. Conectando com a conta de serviço...")
    cliente = gspread.service_account(filename=CREDENCIAL)

    print("2. Abrindo a planilha...")
    try:
        planilha = cliente.open_by_key(PLANILHA_ID)
    except gspread.exceptions.SpreadsheetNotFound:
        erro("planilha não encontrada. Confira o SPREADSHEET_ID")
    print(f"   OK: '{planilha.title}'")

    abas = {aba.title: aba for aba in planilha.worksheets()}

    print("3. Gravando uma linha de teste em 'Leads'...")
    leads = abas["Leads"]
    novo_id = str(uuid.uuid4())
    linha = [""] * len(leads.row_values(1))
    linha[0] = novo_id
    linha[1] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    linha[2] = "Teste PS-Focus (pode apagar)"
    linha[10] = "SDR"
    linha[11] = "Novo"
    leads.append_row(linha, value_input_option="RAW")

    print("4. Lendo a linha de volta...")
    celula = leads.find(novo_id, in_column=1)
    if celula is None:
        erro("gravou, mas não achou a linha depois. Confira a planilha.")
    lida = leads.row_values(celula.row)
    if lida[2] != linha[2]:
        erro("a linha lida é diferente da gravada.")
    print(f"   OK: linha {celula.row}, empresa = '{lida[2]}'")

    print("5. Editando uma célula pelo id...")
    leads.update_cell(celula.row, 3, "Teste PS-Focus Editado")
    if leads.cell(celula.row, 3).value != "Teste PS-Focus Editado":
        erro("a edição não apareceu na planilha.")
    print("   OK")

    if manter:
        print(f"\nTudo Funcionando. A linha {celula.row} foi mantida.")
    else:
        leads.delete_rows(celula.row)
        print("6. Linha de teste apagada.")
        print("\nTudo Funcionando.")


if __name__ == "__main__":
    main()