// Google Apps Script - Food App Feedback Handler
// Dieses Script empfängt Feedback und speichert es in Form_Responses

const SHEET_ID = "1X1leF9642035Ok4huMcOuHwSc1KQB7aKhStgUttYF1s";
const FEEDBACK_SHEET_NAME = "Feedback";
const FORM_RESPONSES_SHEET = "Form_Responses";

function doPost(e) {
  try {
    const params = e.parameter;
    Logger.log("Received params: " + JSON.stringify(params));
    
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const feedbackSheet = spreadsheet.getSheetByName(FEEDBACK_SHEET_NAME);
    
    if (!feedbackSheet) {
      Logger.log("Feedback Sheet nicht gefunden");
      return createResponse(false, "Feedback Sheet nicht gefunden");
    }

    // Form_Responses Sheet suchen
    let responseSheet = feedbackSheet;
    
    if (!responseSheet) {
      Logger.log("Form_Responses Sheet nicht gefunden. Verfügbare Sheets:");
      const sheets = spreadsheet.getSheets();
      sheets.forEach(s => Logger.log("- " + s.getName()));
      return createResponse(false, "Form_Responses Sheet nicht gefunden");
    }

    Logger.log("Feedback Sheet gefunden. Füge Zeile hinzu...");

    // Daten in Form_Responses hinzufügen
    const row = [
      new Date().toLocaleString("de-DE"),  // Zeitstempel
      params.dishId || "",                  // GerichtsId
      params.dish || "",                    // Gericht
      params.overall || "",                 // Gesamtbewertung
      params.chips || "",                   // Chips
      params.comment || ""                  // Kommentar
    ];
    
    Logger.log("Row to append: " + JSON.stringify(row));
    responseSheet.appendRow(row);
    Logger.log("Zeile erfolgreich hinzugefügt");

    return createResponse(true, "Feedback erfolgreich gespeichert");

  } catch (error) {
    Logger.log("Error: " + error.toString());
    Logger.log("Stack: " + error.stack);
    return createResponse(false, "Fehler: " + error.toString());
  }
}

function createResponse(success, message) {
  return ContentService.createTextOutput(
    JSON.stringify({ success: success, message: message })
  ).setMimeType(ContentService.MimeType.JSON);
}
