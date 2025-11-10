const SPREADSHEET_ID = "COLOQUE_AQUI_O_ID_DA_SUA_PLANILHA";
const SHEET_NAME = "Leads";
const REMETENTE = "contato@seudominio.com.br";
const NOME_REMETENTE = "Laura do Valle";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.appendRow(["Nome","Email","DataCadastro","EtapaAtual","UltimoEnvio","Status"]);
    }
    const now = new Date();
    sh.appendRow([data.nome, data.email, now, "D0", now, "ativo"]);
    sendEmailD0(data.nome, data.email);
    return ContentService.createTextOutput("ok").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    console.error(err);
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
  const corpo = HtmlService.createHtmlOutputFromFile("emails/d0_entrega").getContent().replaceAll("{{NOME}}", nome);
  GmailApp.sendEmail(email, assunto, "", {from: REMETENTE, name: NOME_REMETENTE, htmlBody: corpo});
}
function sendEmailD2(nome, email){
  const assunto = "Dica prática para hoje";
  const corpo = HtmlService.createHtmlOutputFromFile("emails/d2_dica").getContent().replaceAll("{{NOME}}", nome);
  GmailApp.sendEmail(email, assunto, "", {from: REMETENTE, name: NOME_REMETENTE, htmlBody: corpo});
}
function sendEmailD4(nome, email){
  const assunto = "Técnica rápida de regulação";
  const corpo = HtmlService.createHtmlOutputFromFile("emails/d4_tecnica").getContent().replaceAll("{{NOME}}", nome);
  GmailApp.sendEmail(email, assunto, "", {from: REMETENTE, name: NOME_REMETENTE, htmlBody: corpo});
}
function sendEmailD6(nome, email){
  const assunto = "Convite para aprofundar (aula/curso)";
  const corpo = HtmlService.createHtmlOutputFromFile("emails/d6_convite").getContent().replaceAll("{{NOME}}", nome);
  GmailApp.sendEmail(email, assunto, "", {from: REMETENTE, name: NOME_REMETENTE, htmlBody: corpo});
}
