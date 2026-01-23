// Google Apps Script - Food App Feedback Handler
// Dieses Script empfängt Feedback und speichert es in Form_Responses

const SHEET_ID = "1X1leF9642035Ok4huMcOuHwSc1KQB7aKhStgUttYF1s";
const FEEDBACK_SHEET_NAME = "Feedback";
const FORM_RESPONSES_SHEET = "Form_Responses";

function doPost(e) {
  try {
    const params = e.parameter;
    
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const feedbackSheet = spreadsheet.getSheetByName(FEEDBACK_SHEET_NAME);
    
    if (!feedbackSheet) {
      return createResponse(false, "Feedback Sheet nicht gefunden");
    }

    // Form_Responses Sheet suchen
    let responseSheet = feedbackSheet.getSheetByName(FORM_RESPONSES_SHEET);
    
    if (!responseSheet) {
      return createResponse(false, "Form_Responses Sheet nicht gefunden");
    }

    // Daten in Form_Responses hinzufügen
    responseSheet.appendRow([
      new Date().toLocaleString("de-DE"),  // Zeitstempel
      "",                                   // E-Mail (optional)
      params.dish || "",                    // Gericht
      params.overall || "",                 // Gesamtbewertung
      params.food || "",                    // Essen
      params.wait || "",                    // Wartezeit
      params.comment || ""                  // Kommentar
    ]);

    return createResponse(true, "Feedback erfolgreich gespeichert");

  } catch (error) {
    Logger.log("Error: " + error.toString());
    return createResponse(false, "Fehler: " + error.toString());
  }
}

function createResponse(success, message) {
  return ContentService.createTextOutput(
    JSON.stringify({ success: success, message: message })
  ).setMimeType(ContentService.MimeType.JSON);
}
