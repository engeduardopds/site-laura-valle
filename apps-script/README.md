# Automação (Google Apps Script) — Passo a passo

1) Crie uma planilha no Google Sheets com as colunas:
   Nome | Email | DataCadastro | EtapaAtual | UltimoEnvio | Status

2) No Google Apps Script (script.google.com):
   - Novo projeto > crie `webapp.gs` e cole o conteúdo.
   - Crie as pastas/arquivos em `emails/` e cole os HTMLs D0/D2/D4/D6.
   - Ajuste: SPREADSHEET_ID, REMETENTE, NOME_REMETENTE.
   - Deploy > New deployment > Web app > `Anyone with the link`.
   - Copie a URL e substitua `WEB_APP_URL` em `recursos.html`.

3) Em Triggers (Relógio):
   - Crie um gatilho diário 09:00 para `processDaily`.
   - (Opcional) outro para `processUnsubscribes`.

4) Teste no site (Netlify) e confirme:
   - Recebe D0 com link do PDF.
   - Depois de 2d, D2 > 2d, D4 > 2d, D6.
