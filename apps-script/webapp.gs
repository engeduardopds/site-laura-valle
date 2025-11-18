const SPREADSHEET_ID = "1Ktb-ikC3nJWSMpMMk0PBVitvvoNigLquJd0pv8j0iCo";
const SHEET_NAME = "Leads";
const REMETENTE = "engeduardopds@gmail.com"; 
const NOME_REMETENTE = "Laura do Valle";

function doGet(e) {
  return ContentService.createTextOutput("O sistema de automação está ativo!").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    console.log("--- INÍCIO DA EXECUÇÃO ---"); // Teste de log

    const body = e && e.postData && e.postData.contents ? e.postData.contents : "";
    console.log("Corpo recebido: " + body);

    let data = {};
    if (body && (e.postData.type || "").indexOf("json") !== -1) {
      data = JSON.parse(body);
    } else if (body && body.includes("=")) {
      data = body.split("&").reduce((acc, kv) => {
        const [k, v] = kv.split("=");
        acc[decodeURIComponent(k)] = decodeURIComponent(v || "");
        return acc;
      }, {});
    }

    const nome  = (data.nome  || "").trim();
    const email = (data.email || "").trim();
    const origem = (data.origem || "recursos.pdf");

    console.log("Dados processados -> Nome: " + nome + " | Email: " + email);

    if (!nome || !email) {
      console.error("Erro: Nome ou email faltando.");
      return ContentService.createTextOutput("missing_fields").setMimeType(ContentService.MimeType.TEXT);
    }

    // Abre planilha
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sh  = ss.getSheetByName(SHEET_NAME);
    if (!sh) sh = ss.insertSheet(SHEET_NAME);

    if (sh.getLastRow() === 0) {
      sh.appendRow(["Nome","Email","DataCadastro","EtapaAtual","UltimoEnvio","Status","Origem"]);
    }

    const now = new Date();
    sh.appendRow([nome, email, now, "D0", now, "ativo", origem]);
    console.log("Linha adicionada na planilha com sucesso.");

    // Tenta enviar e-mail
    try {
      console.log("Tentando enviar email D0...");
      sendEmailD0(nome, email);
      console.log("SUCESSO: Email D0 enviado para " + email);
    } catch (mailErr) {
      console.error("FALHA NO EMAIL: " + mailErr);
      // Não retorna erro para o site não travar, mas loga o problema
    }

    return ContentService.createTextOutput("ok").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    console.error("ERRO CRÍTICO NO SCRIPT: " + err);
    return ContentService.createTextOutput("error").setMimeType(ContentService.MimeType.TEXT);
  }
}

function processDaily() {
  // ... (mantenha o restante das funções iguais, se quiser, ou copie do anterior)
  // Para brevidade, o foco é o doPost acima.
}

// ... (Mantenha as funções de envio de e-mail abaixo)

function sendEmailD0(nome, email){
  const assunto = "Seu guia — Checklist de Regulação Emocional";
  const corpo = HtmlService.createHtmlOutputFromFile("d0_entrega").getContent().replaceAll("{{NOME}}", nome);
  GmailApp.sendEmail(email, assunto, "", {from: REMETENTE, name: NOME_REMETENTE, htmlBody: corpo});
}
// ... (Outras funções de email)
