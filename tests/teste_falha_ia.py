import unittest
from unittest.mock import patch

from backend.processamento_ia import processar_ia_do_lead


class TesteFalhaIA(unittest.TestCase):

    @patch("backend.processamento_ia.atualizar_lead")
    @patch("backend.processamento_ia.classificar_lead")
    @patch("backend.processamento_ia.obter_lead")
    def test_erro_da_ia(
        self, mock_obter, mock_classificar, mock_atualizar
    ):


        mock_obter.return_value = {
            "descricao": "Precisamos automatizar o atendimento.",
            "solucao_interesse": "Automação de Processos"
        }

        mock_classificar.side_effect = Exception("Falha simulada")

        mock_atualizar.return_value = True

        with self.assertLogs("backend.processamento_ia", level="ERROR"):
            resultado = processar_ia_do_lead("lead-ficticio")

        self.assertFalse(resultado)

        mock_atualizar.assert_called_once_with(
            "lead-ficticio",
            {"status_ia": "Erro"}
        )

if __name__ == "__main__":
    unittest.main()