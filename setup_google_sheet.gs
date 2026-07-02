/**
 * QuadSci Signal Intelligence — Google Sheet Auto-Setup Script
 * ─────────────────────────────────────────────────────────────
 * HOW TO RUN:
 *   1. Go to script.google.com
 *   2. Click "+ New project"
 *   3. Delete all existing code in the editor
 *   4. Paste this entire script
 *   5. Click the ▶ Run button (or press Ctrl+R)
 *   6. Grant permissions when prompted
 *   7. Done — your sheet is fully set up with all 3 tabs
 *
 * The spreadsheet already exists in your Google Drive.
 * This script adds all 3 tabs, column headers, and dropdowns to it.
 * ─────────────────────────────────────────────────────────────
 */

// ── SPREADSHEET ALREADY CREATED — ID IS HARDCODED BELOW ──────
const SPREADSHEET_ID = '1_hKjUHNR_h27QrITATMeFLgHaEvzbWnRiP3qSF-jCyk';

function createQuadSciSheet() {

  // ── Open the existing spreadsheet ──────────────────────────
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  const url = ss.getUrl();
  const id  = ss.getId();

  Logger.log('✅ Spreadsheet created!');
  Logger.log('📋 URL: ' + url);
  Logger.log('🔑 Spreadsheet ID (copy this for n8n): ' + id);


  // ── TAB 1: Signal Log ───────────────────────────────────────
  const signalLog = ss.getSheets()[0];
  signalLog.setName('Signal Log');

  const signalLogHeaders = [
    'Date',
    'Company Domain',
    'Company Name',
    'Signal Type',
    'Signal Summary',
    'Source URL',
    'Status'
  ];

  signalLog.getRange(1, 1, 1, signalLogHeaders.length)
    .setValues([signalLogHeaders])
    .setFontWeight('bold')
    .setBackground('#6B46C1')
    .setFontColor('#FFFFFF');

  signalLog.setColumnWidth(1, 100);  // Date
  signalLog.setColumnWidth(2, 160);  // Company Domain
  signalLog.setColumnWidth(3, 180);  // Company Name
  signalLog.setColumnWidth(4, 100);  // Signal Type
  signalLog.setColumnWidth(5, 350);  // Signal Summary
  signalLog.setColumnWidth(6, 300);  // Source URL
  signalLog.setColumnWidth(7, 110);  // Status
  signalLog.setFrozenRows(1);


  // ── TAB 2: Scored Accounts ──────────────────────────────────
  const scored = ss.insertSheet('Scored Accounts');

  const scoredHeaders = [
    'Date Flagged',
    'Company Domain',
    'Company Name',
    'Signal Count',
    'Signal Types',
    'Signal Summaries',
    'Employee Count',
    'Funding Stage',
    'Estimated ARR',
    'Tech Stack',
    'CS Headcount',
    'Firmographic Score',
    'Signal Score',
    'Tech Score',
    'Total Score',
    'Tier',
    'Buyer Name',
    'Buyer Title',
    'Buyer Email',
    'Email Verified',
    'Status'
  ];

  scored.getRange(1, 1, 1, scoredHeaders.length)
    .setValues([scoredHeaders])
    .setFontWeight('bold')
    .setBackground('#1A1A2E')
    .setFontColor('#FFFFFF');

  // Set reasonable column widths
  const scoredWidths = [100, 160, 180, 100, 110, 350, 120, 130, 130, 200, 120, 150, 120, 110, 110, 90, 150, 180, 200, 120, 160];
  scoredWidths.forEach((w, i) => scored.setColumnWidth(i + 1, w));
  scored.setFrozenRows(1);


  // ── TAB 3: Review Queue ─────────────────────────────────────
  const queue = ss.insertSheet('Review Queue');

  const queueHeaders = [
    'Date Added',
    'Company Name',
    'Buyer Name',
    'Buyer Title',
    'Buyer Email',
    'Tier',
    'Total Score',
    'Signal Summary',
    'Generated Email',
    'Your Action',
    'Your Notes',
    'Send Date',
    'Reply Date',
    'Outcome'
  ];

  queue.getRange(1, 1, 1, queueHeaders.length)
    .setValues([queueHeaders])
    .setFontWeight('bold')
    .setBackground('#16A34A')
    .setFontColor('#FFFFFF');

  // "Your Action" column — highlight it so Prasun knows where to type
  queue.getRange(1, 10)
    .setBackground('#D97706')
    .setFontColor('#FFFFFF')
    .setNote('TYPE HERE: APPROVE, REJECT, or EDIT for each account');

  queue.setColumnWidth(1, 100);  // Date Added
  queue.setColumnWidth(2, 180);  // Company Name
  queue.setColumnWidth(3, 150);  // Buyer Name
  queue.setColumnWidth(4, 180);  // Buyer Title
  queue.setColumnWidth(5, 200);  // Buyer Email
  queue.setColumnWidth(6, 80);   // Tier
  queue.setColumnWidth(7, 100);  // Total Score
  queue.setColumnWidth(8, 300);  // Signal Summary
  queue.setColumnWidth(9, 450);  // Generated Email (wide — full email goes here)
  queue.setColumnWidth(10, 120); // Your Action
  queue.setColumnWidth(11, 300); // Your Notes
  queue.setColumnWidth(12, 100); // Send Date
  queue.setColumnWidth(13, 100); // Reply Date
  queue.setColumnWidth(14, 180); // Outcome

  // Wrap text in Generated Email column
  queue.getRange('I:I').setWrap(true);
  queue.setFrozenRows(1);


  // ── Data validation: Status dropdown for Signal Log ─────────
  const signalStatusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['New', 'Clustered', 'Expired'], true)
    .build();
  signalLog.getRange('G2:G1000').setDataValidation(signalStatusRule);

  // Data validation: Your Action dropdown for Review Queue
  const actionRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['APPROVE', 'REJECT', 'EDIT'], true)
    .build();
  queue.getRange('J2:J1000').setDataValidation(actionRule);

  // Data validation: Tier dropdown for Scored Accounts
  const tierRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Tier 1', 'Tier 2', 'Tier 3', 'Discard'], true)
    .build();
  scored.getRange('P2:P1000').setDataValidation(tierRule);

  // Data validation: Status pipeline for Scored Accounts
  const scoredStatusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      'Pending Enrichment', 'Enriched', 'Scored', 'Copy Ready',
      'In Review Queue', 'Approved', 'Sent', 'Replied', 'Meeting Booked'
    ], true)
    .build();
  scored.getRange('U2:U1000').setDataValidation(scoredStatusRule);


  // ── Final log ───────────────────────────────────────────────
  Logger.log('');
  Logger.log('════════════════════════════════════════');
  Logger.log('✅ ALL DONE — Your Google Sheet is ready!');
  Logger.log('');
  Logger.log('📋 Open your sheet here:');
  Logger.log(url);
  Logger.log('');
  Logger.log('🔑 SPREADSHEET ID (paste into n8n workflows):');
  Logger.log(id);
  Logger.log('════════════════════════════════════════');
  Logger.log('');
  Logger.log('NEXT STEP: Copy the Spreadsheet ID above.');
  Logger.log('You will paste it into each n8n workflow JSON file');
  Logger.log('wherever you see: YOUR_SPREADSHEET_ID');

  Logger.log('✅ ALL DONE — open your sheet and confirm the 3 tabs are there.');

  return { url, id };
}
