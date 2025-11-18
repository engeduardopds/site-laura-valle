const SPREADSHEET_ID = "1Ktb-ikC3nJWSMpMMk0PBVitvvoNigLquJd0pv8j0iCo";
const SHEET_NAME = "Leads";
// ATENÇÃO: Certifique-se que este email é o mesmo da conta onde criou o script
const REMETENTE = "engeduardopds@gmail.com"; 
const NOME_REMETENTE = "Laura do Valle";

// --- NOVO: Função para responder quando se acede ao link pelo navegador ---
function doGet(e) {
  return ContentService.createTextOutput("O sistema de automação está ativo! Use o formulário do site para enviar dados.").setMimeType(ContentService.MimeType.TEXT);
}
// ------------------------------------------------------------------------

function doPost(e) {
  try {
    // 1) Diagnóstico do que chegou
    const body = e && e.postData && e.postData.contents ? e.postData.contents : "";
    Logger.log("RAW BODY: " + body);

    // Suporta JSON (fetch) e x-www-form-urlencoded (fallback)
    let data = {};
    if (body && (e.postData.type || "").indexOf("json") !== -1) {
      data = JSON.parse(body);
    } else if (body && body.includes("=")) {
      // fallback simples para form-urlencoded
      data = body.split("&").reduce((acc, kv) => {
        const [k, v] = kv.split("=");
        acc[decodeURIComponent(k)] = decodeURIComponent(v || "");
        return acc;
      }, {});
    }

    const nome  = (data.nome  || "").trim();
    const email = (data.email || "").trim();
    const origem = (data.origem || "recursos.pdf");

    if (!nome || !email) {
      Logger.log("Faltam campos obrigatórios.");
      return ContentService.createTextOutput("missing_fields").setMimeType(ContentService.MimeType.TEXT);
    }

    // 2) Abre/Cria planilha e aba
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sh  = ss.getSheetByName(SHEET_NAME);
    if (!sh) sh = ss.insertSheet(SHEET_NAME);

    // Cabeçalho se vazio
    if (sh.getLastRow() === 0) {
      sh.appendRow(["Nome","Email","DataCadastro","EtapaAtual","UltimoEnvio","Status","Origem"]);
    }

    // 3) Escreve lead
    const now = new Date();
    sh.appendRow([nome, email, now, "D0", now, "ativo", origem]);

    // 4) Envia e-mail D0 (se templates existirem)
    try {
      Logger.log("Tentando enviar email para: " + email);
      sendEmailD0(nome, email);
      Logger.log("Email enviado com sucesso!");
    } catch (mailErr) {
      Logger.log("ERRO CRÍTICO ao enviar D0: " + mailErr);
    }

    return ContentService.createTextOutput("ok").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    Logger.log("ERRO doPost: " + err);
    return ContentService.createTextOutput("error").setMimeType(ContentService.MimeType.TEXT);
  }
}

function processDaily() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) return;

  const rows = sh.getDataRange().getValues();
  const header = rows.shift();
  const idx = {};
  header.forEach((h,i)=>idx[h]=i);

  const now = new Date();
  rows.forEach((r,i)=>{
    const status = r[idx["Status"]];
    if (status!=="ativo") return;
    const etapa = r[idx["EtapaAtual"]];
    const email = r[idx["Email"]];
    const nome = r[idx["Nome"]];
    const ultimo = new Date(r[idx["UltimoEnvio"]]);
    const dias = Math.floor((now-ultimo)/(1000*60*60*24));
    if (etapa==="D0" && dias>=2){ sendEmailD2(nome,email); update(i+2,"D2"); }
    else if (etapa==="D2" && dias>=2){ sendEmailD4(nome,email); update(i+2,"D4"); }
    else if (etapa==="D4" && dias>=2){ sendEmailD6(nome,email); update(i+2,"D6"); }
  });
  function update(rowIdx, nova){
    const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    sh.getRange(rowIdx, 4).setValue(nova); // EtapaAtual
    sh.getRange(rowIdx, 5).setValue(new Date()); // UltimoEnvio
  }
}

function processUnsubscribes() {
  const threads = GmailApp.search('subject:REMOVER newer_than:7d');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) return;
  const data = sh.getDataRange().getValues();
  const header = data.shift();
  const idx = {};
  header.forEach((h,i)=>idx[h]=i);
  const emails = new Set();
  threads.forEach(t=>{
    t.getMessages().forEach(m=>{
      emails.add(m.getFrom().replace(/^.*<|>.*$/g,"").toLowerCase());
    });
  });
  data.forEach((r,i)=>{
    const email = String(r[idx["Email"]]).toLowerCase();
    if (emails.has(email) && r[idx["Status"]]!=="removido"){
      sh.getRange(i+2, idx["Status"]+1).setValue("removido");
    }
  });
}

// ===== E-mails (HTML em arquivos separados) =====
function sendEmailD0(nome, email){
  const assunto = "Seu guia — Checklist de Regulação Emocional";
  // Verifica se o arquivo existe antes de tentar carregar
  const corpo = HtmlService.createHtmlOutputFromFile("d0_entrega").getContent().replaceAll("{{NOME}}", nome);
  GmailApp.sendEmail(email, assunto, "", {from: REMETENTE, name: NOME_REMETENTE, htmlBody: corpo});
}
function sendEmailD2(nome, email){
  const assunto = "Dica prática para hoje";
  const corpo = HtmlService.createHtmlOutputFromFile("d2_dica").getContent().replaceAll("{{NOME}}", nome);
  GmailApp.sendEmail(email, assunto, "", {from: REMETENTE, name: NOME_REMETENTE, htmlBody: corpo});
}
function sendEmailD4(nome, email){
  const assunto = "Técnica rápida de regulação";
  const corpo = HtmlService.createHtmlOutputFromFile("d4_tecnica").getContent().replaceAll("{{NOME}}", nome);
  GmailApp.sendEmail(email, assunto, "", {from: REMETENTE, name: NOME_REMETENTE, htmlBody: corpo});
}
function sendEmailD6(nome, email){
  const assunto = "Convite para aprofundar (aula/curso)";
  const corpo = HtmlService.createHtmlOutputFromFile("d6_convite").getContent().replaceAll("{{NOME}}", nome);
  GmailApp.sendEmail(email, assunto, "", {from: REMETENTE, name: NOME_REMETENTE, htmlBody: corpo});
}
