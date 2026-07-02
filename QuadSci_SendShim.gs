/**
 * QuadSci GTM Demo — Apps Script Send Shim
 * Architecture: Google Sheets-based (free-tier safe — no Clay REST API required)
 *
 * HOW TO DEPLOY:
 *   1. Open the Google Sheet created by QuadSci_SheetSetup.gs
 *   2. Extensions → Apps Script → new script file
 *   3. Paste this entire file (replace any placeholder code)
 *   4. Set Script Properties (Project Settings → Script Properties):
 *        SHEET_ID      → the ID from your Google Sheet URL (between /d/ and /edit)
 *        DEMO_EMAIL    → pmukhopadhyay5537@gmail.com
 *        DEMO_MODE     → true
 *   5. Run setupTriggers() ONCE to install the 5-minute time trigger
 *   6. Authorize both Gmail and Sheets permissions when prompted
 *
 * DEMO FLOW:
 *   - Row with send_status="queued" AND action="APPROVE" AND tier="Tier 1" → SENDS
 *   - In demo mode, ALL sends go to DEMO_EMAIL regardless of buyer_email column
 *   - Tier 2 and Tier 3 rows have send_status="not_sent_mvp_watchlist" → never eligible
 *   - After send: send_status="sent", sent_at=timestamp, thread_id stored
 *   - Reply check: looks for replies on stored thread, updates reply_received
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG — loaded from Script Properties (never hardcoded)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @returns {{ sheetId: string, demoEmail: string, demoMode: boolean,
 *             sendQueueTab: string, signature: string }}
 */
function getConfig() {
  var props = PropertiesService.getScriptProperties();

  var sheetId   = props.getProperty("SHEET_ID");
  var demoEmail = props.getProperty("DEMO_EMAIL");
  var demoMode  = props.getProperty("DEMO_MODE");

  // Explicit validation — fail loudly, not silently
  if (!sheetId)   throw new Error("CONFIG ERROR: SHEET_ID is not set in Script Properties.");
  if (!demoEmail) throw new Error("CONFIG ERROR: DEMO_EMAIL is not set in Script Properties.");

  return {
    sheetId:      sheetId,
    demoEmail:    demoEmail,
    demoMode:     (demoMode !== "false"),  // defaults to TRUE — safe posture
    sendQueueTab: "Send Queue",
    signature:    "\n\nBest,\nPrasun M.\nHead of GTM at QuadSci"
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// COLUMN INDEX MAP — single source of truth for Send Queue column positions
// If you add columns to the sheet, update ONLY this map.
// ═══════════════════════════════════════════════════════════════════════════
var COL = {
  QUEUE_ID:        1,
  DOMAIN:          2,
  COMPANY_NAME:    3,
  BUYER_EMAIL:     4,
  BUYER_NAME:      5,
  BUYER_TITLE:     6,
  TIER:            7,
  ACTION:          8,
  EMAIL_SUBJECT:   9,
  EMAIL_BODY:      10,
  YOUR_EDITS:      11,
  SEND_STATUS:     12,
  SENT_AT:         13,
  DELIVERY_STATUS: 14,
  THREAD_ID:       15,
  REPLY_RECEIVED:  16,
  REPLY_SENTIMENT: 17,
  MEETING_BOOKED:  18,
  ERROR_MESSAGE:   19
};

// Send-eligible statuses (the only value the main loop acts on)
var STATUS = {
  QUEUED:      "queued",
  SENT:        "sent",
  FAILED:      "failed",
  HELD:        "held",
  WATCHLIST:   "not_sent_mvp_watchlist"
};


// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT — runs every 5 minutes via time trigger
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scans the Send Queue for rows eligible to send, sends them,
 * and writes results back to the sheet.
 *
 * Eligibility criteria (ALL must be true):
 *   tier        == "Tier 1"   — only Tier 1 sends in MVP
 *   action      == "APPROVE"  — explicit human approval required
 *   send_status == "queued"   — not already sent or failed
 */
function sendQueuedEmails() {
  var config = getConfig();
  var sheet  = _getSheet(config.sheetId, config.sendQueueTab);
  var rows   = _getAllDataRows(sheet);

  var eligibleCount = 0;
  var sentCount     = 0;
  var failedCount   = 0;

  for (var i = 0; i < rows.length; i++) {
    var row    = rows[i];
    var rowNum = i + 2; // +2 because data starts at row 2 (row 1 is header)

    var tier       = String(row[COL.TIER - 1]).trim();
    var action     = String(row[COL.ACTION - 1]).trim();
    var sendStatus = String(row[COL.SEND_STATUS - 1]).trim();

    // Skip everything that isn't Tier 1 + APPROVE + queued
    if (tier !== "Tier 1" || action !== "APPROVE" || sendStatus !== STATUS.QUEUED) {
      continue;
    }

    eligibleCount++;

    var recipientEmail = config.demoMode
      ? config.demoEmail
      : String(row[COL.BUYER_EMAIL - 1]).trim();

    // Validate recipient before attempting send
    if (!recipientEmail || !_isValidEmail(recipientEmail)) {
      _writeBackError(sheet, rowNum, "Invalid or empty recipient email: " + recipientEmail);
      failedCount++;
      continue;
    }

    // Use your_edits override if non-empty; otherwise use generated body
    var yourEdits    = String(row[COL.YOUR_EDITS - 1]).trim();
    var emailBody    = yourEdits !== "" ? yourEdits : String(row[COL.EMAIL_BODY - 1]).trim();
    var emailSubject = String(row[COL.EMAIL_SUBJECT - 1]).trim();

    if (!emailBody || !emailSubject) {
      _writeBackError(sheet, rowNum, "Email subject or body is empty — skipping.");
      failedCount++;
      continue;
    }

    var fullBody = emailBody + config.signature;

    // Attempt send
    try {
      GmailApp.sendEmail(recipientEmail, emailSubject, fullBody);

      // Find the sent thread to enable reply tracking
      var threadId = _findSentThreadId(emailSubject);

      // Write success state back to sheet
      sheet.getRange(rowNum, COL.SEND_STATUS).setValue(STATUS.SENT);
      sheet.getRange(rowNum, COL.SENT_AT).setValue(
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
      );
      sheet.getRange(rowNum, COL.DELIVERY_STATUS).setValue("delivered");
      sheet.getRange(rowNum, COL.THREAD_ID).setValue(threadId || "");
      sheet.getRange(rowNum, COL.ERROR_MESSAGE).setValue("");

      // Color the row green to make it visible in demo
      sheet.getRange(rowNum, COL.SEND_STATUS).setBackground("#d1fae5");

      Logger.log("SENT: row " + rowNum + " | to: " + recipientEmail + " | subject: " + emailSubject);
      sentCount++;

    } catch (e) {
      _writeBackError(sheet, rowNum, e.message);
      Logger.log("FAILED: row " + rowNum + " | error: " + e.message);
      failedCount++;
    }
  }

  SpreadsheetApp.flush();
  Logger.log(
    "sendQueuedEmails complete. Eligible: " + eligibleCount +
    " | Sent: " + sentCount +
    " | Failed: " + failedCount
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// REPLY TRACKER — call this on a separate 15-minute trigger
// Polls Gmail for replies on threads we know we sent
// ═══════════════════════════════════════════════════════════════════════════

/**
 * For every row with send_status="sent" and reply_received=FALSE,
 * checks the stored Gmail thread for inbound messages.
 * Updates reply_received and reply_sentiment when a reply is found.
 *
 * Note: reply_sentiment classification is a simple keyword-match here.
 * In production, replace _classifySentiment() with a Claude API call.
 */
function checkForReplies() {
  var config = getConfig();
  var sheet  = _getSheet(config.sheetId, config.sendQueueTab);
  var rows   = _getAllDataRows(sheet);

  for (var i = 0; i < rows.length; i++) {
    var row        = rows[i];
    var rowNum     = i + 2;
    var sendStatus = String(row[COL.SEND_STATUS - 1]).trim();
    var threadId   = String(row[COL.THREAD_ID - 1]).trim();
    var replyRx    = row[COL.REPLY_RECEIVED - 1];

    // Only check rows that were sent, have a thread ID, and haven't logged a reply yet
    if (sendStatus !== STATUS.SENT || !threadId || replyRx === true) {
      continue;
    }

    try {
      var thread   = GmailApp.getThreadById(threadId);
      if (!thread) continue;

      var messages = thread.getMessages();
      // messages[0] is the email we sent; if length > 1, there's a reply
      if (messages.length > 1) {
        var replyText = messages[messages.length - 1].getPlainBody();
        var sentiment = _classifySentiment(replyText);

        sheet.getRange(rowNum, COL.REPLY_RECEIVED).setValue(true);
        sheet.getRange(rowNum, COL.REPLY_SENTIMENT).setValue(sentiment);
        Logger.log("Reply detected: row " + rowNum + " | sentiment: " + sentiment);
      }
    } catch (e) {
      Logger.log("Reply check error: row " + rowNum + " | " + e.message);
    }
  }

  SpreadsheetApp.flush();
}


// ═══════════════════════════════════════════════════════════════════════════
// SETUP — run ONCE to install time triggers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates two time-based triggers:
 *   sendQueuedEmails  — every 5 minutes
 *   checkForReplies   — every 15 minutes
 *
 * Safe to call multiple times — deletes existing triggers first to avoid
 * duplicates (idempotent).
 */
function setupTriggers() {
  // Delete existing triggers for these functions
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    var name = t.getHandlerFunction();
    if (name === "sendQueuedEmails" || name === "checkForReplies") {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Re-create
  ScriptApp.newTrigger("sendQueuedEmails")
    .timeBased()
    .everyMinutes(5)
    .create();

  ScriptApp.newTrigger("checkForReplies")
    .timeBased()
    .everyMinutes(15)
    .create();

  Logger.log("Triggers installed: sendQueuedEmails (5 min), checkForReplies (15 min)");
  Browser.msgBox("Triggers installed.\n\nsendQueuedEmails: every 5 minutes\ncheckForReplies: every 15 minutes\n\nThe workflow is now live.");
}


// ═══════════════════════════════════════════════════════════════════════════
// DEMO HELPER — call this manually to force an immediate send during demo
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Runs sendQueuedEmails immediately (same logic, no wait for trigger).
 * Use during the live interview demo: set Action=APPROVE in Clay / sheet,
 * then run this function from the Apps Script editor to send instantly.
 */
function runDemoSendNow() {
  Logger.log("Manual demo send triggered at " + new Date().toISOString());
  sendQueuedEmails();
}


// ═══════════════════════════════════════════════════════════════════════════
// PRIVATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Opens and returns a sheet by name. Throws clearly if not found.
 * @param {string} spreadsheetId
 * @param {string} tabName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function _getSheet(spreadsheetId, tabName) {
  var ss    = SpreadsheetApp.openById(spreadsheetId);
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    throw new Error("Sheet not found: '" + tabName + "' in spreadsheet " + spreadsheetId);
  }
  return sheet;
}

/**
 * Returns all data rows (excluding header) as a 2D array.
 * Empty rows (where column A is blank) are excluded.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {Array<Array>}
 */
function _getAllDataRows(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return []; // no data rows

  var numCols = Object.keys(COL).length; // total columns we care about
  var data    = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();

  // Filter out blank rows
  return data.filter(function(row) {
    return String(row[0]).trim() !== "";
  });
}

/**
 * Searches Gmail Sent folder for an email with matching subject, returns thread ID.
 * Waits up to 3 seconds for Gmail to index the sent email.
 * @param {string} subject
 * @returns {string|null} Gmail thread ID, or null if not found
 */
function _findSentThreadId(subject) {
  Utilities.sleep(2000); // brief wait for Gmail indexing

  var query   = 'in:sent subject:"' + subject.replace(/"/g, '\\"') + '"';
  var threads = GmailApp.search(query, 0, 5);

  if (threads.length === 0) {
    Logger.log("Thread not found for subject: " + subject);
    return null;
  }

  // Return the most recently sent thread (first result, sorted by date desc)
  return threads[0].getId();
}

/**
 * Simple keyword-based sentiment classifier for reply text.
 * Replace this with an LLM call in production for higher accuracy.
 * @param {string} replyText
 * @returns {"positive"|"neutral"|"negative"|"unsubscribe"}
 */
function _classifySentiment(replyText) {
  var text = replyText.toLowerCase();

  var unsubscribeKw = ["unsubscribe", "remove me", "stop emailing", "opt out", "do not contact"];
  var negativeKw    = ["not interested", "no thanks", "wrong person", "not relevant", "don't reach out"];
  var positiveKw    = ["interested", "yes", "sounds good", "let's talk", "book", "calendar",
                       "schedule", "tell me more", "great timing", "absolutely"];

  for (var i = 0; i < unsubscribeKw.length; i++) {
    if (text.indexOf(unsubscribeKw[i]) !== -1) return "unsubscribe";
  }
  for (var i = 0; i < negativeKw.length; i++) {
    if (text.indexOf(negativeKw[i]) !== -1) return "negative";
  }
  for (var i = 0; i < positiveKw.length; i++) {
    if (text.indexOf(positiveKw[i]) !== -1) return "positive";
  }
  return "neutral";
}

/**
 * Validates an email address using a basic regex.
 * Catches the most common failure modes (empty, malformed) without false positives.
 * @param {string} email
 * @returns {boolean}
 */
function _isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Writes an error state back to a sheet row.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} rowNum
 * @param {string} errorMessage
 */
function _writeBackError(sheet, rowNum, errorMessage) {
  sheet.getRange(rowNum, COL.SEND_STATUS).setValue(STATUS.FAILED);
  sheet.getRange(rowNum, COL.ERROR_MESSAGE).setValue(errorMessage);
  sheet.getRange(rowNum, COL.SEND_STATUS).setBackground("#fee2e2"); // red
}
