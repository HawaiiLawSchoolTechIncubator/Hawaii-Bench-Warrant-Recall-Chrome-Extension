// Logging utility
const overviewLog = (message) =>
  console.log(`[overview.js] ${message} - ${new Date().toISOString()}`);

overviewLog("Script started");

// Flag to indicate if we're currently processing
let isProcessing = false;

// Wrapper functions to handle potential asynchronous nature of global functions
async function safeGetCases() {
  return new Promise((resolve, reject) => {
    const checkFunction = () => {
      if (typeof getCases === "function") {
        const result = getCases();
        resolve(result instanceof Promise ? result : Promise.resolve(result));
      } else {
        setTimeout(checkFunction, 100); // Check again after 100ms
      }
    };
    checkFunction();
  });
}

async function safeGetClient() {
  return new Promise((resolve, reject) => {
    const checkFunction = () => {
      if (typeof getClient === "function") {
        const result = getClient();
        resolve(result instanceof Promise ? result : Promise.resolve(result));
      } else {
        setTimeout(checkFunction, 100);
      }
    };
    checkFunction();
  });
}

async function safeSaveClientToChromeLocalStorage(firstname, lastname) {
  return new Promise((resolve, reject) => {
    const checkFunction = () => {
      if (typeof saveClientToChromeLocalStorage === "function") {
        const result = saveClientToChromeLocalStorage(firstname, lastname);
        resolve(result instanceof Promise ? result : Promise.resolve(result));
      } else {
        setTimeout(checkFunction, 100);
      }
    };
    checkFunction();
  });
}

// Append status for existing case
function appendExistingCaseStatus($cell, status, explanation) {
  let bgColor;
  switch (status?.toLowerCase()) {
    case "all expungeable":
      bgColor = "lightgreen";
      break;
    case "not expungeable":
    case "none expungeable":
      bgColor = "lightcoral";
      break;
    case "some expungeable":
      bgColor = "lightyellow";
      break;
    default:
      bgColor = "orange";
  }

  // Only modify the cell's properties, not its structure
  $cell
    .css("background-color", bgColor)
    .text(status || "")
    .attr("data-bs-toggle", "tooltip")
    .attr("data-bs-placement", "top")
    .attr("title", explanation || "No explanation available");
}

function appendWarrantStatus($cell, warrantStatus) {
  let bgColor, text, tooltip;
  let noWarrantTooltip;
  
  if (!warrantStatus || warrantStatus.warrantEntries.length === 0) {
    bgColor = "lightgreen";
    text = "No Warrant Found";
    noWarrantTooltip = "Found no mention of warrants in case details";
  } else if (warrantStatus.hasOutstandingWarrant) {
    bgColor = "lightcoral";
    text = warrantStatus.latestWarrantType === "penal summons" ? 
           "Outstanding Summons" : "Outstanding Warrant";
  } else if (warrantStatus.warrantEntries?.length > 0) {
    bgColor = "lightgreen";
    text = "No Outstanding Warrant";
  } else {
    bgColor = "white";
    text = "";
  }

  tooltip = warrantStatus?.explanation || noWarrantTooltip || "No explanation available";

  $cell
    .css("background-color", bgColor)
    .text(text)
    .attr("data-bs-toggle", "tooltip")
    .attr("data-bs-placement", "top")
    .attr("title", tooltip);
}

// Main processing function
async function processCases() {
  // Process client info if present
  const nameElement = $("#frm\\:j_idt67");
  if (nameElement.length) {
    const nameLine = nameElement.text();
    const [lastName, firstName] = parseNameLine(nameLine);
    overviewLog(`Parsed name: ${firstName} ${lastName}`);
    await safeSaveClientToChromeLocalStorage(firstName, lastName);
  }

  overviewLog("Processing cases");
  try {
    // Process client info if present
    const nameElement = $("#frm\\:j_idt67");
    if (nameElement.length) {
      const nameLine = nameElement.text();
      const [lastName, firstName] = parseNameLine(nameLine);
      overviewLog(`Parsed name: ${firstName} ${lastName}`);
      await safeSaveClientToChromeLocalStorage(firstName, lastName);
    }

    // Get existing cases and update table
    const cases = await safeGetCases();
    await processCaseTable(cases);
  } catch (error) {
    console.error("Failed to process cases:", error);
    console.error(error.stack);
  }
}

// Process case table
async function processCaseTable(existingCases) {
  overviewLog("Starting processCaseTable");
  const casesTable = $("#frm\\:partyNameSearchResultsTableIntECC");
  if (!casesTable.length) {
    overviewLog("Case table not found");
    return;
  }

  // Initialize tracking arrays/maps
  const casesToRetrieve = [];
  const caseRowMap = new Map();

  // Load eCourtCodes early as they're needed for case type checking
  const eCourtCodes = await fetch(chrome.runtime.getURL("ecourt_kokua_codes.json"))
    .then((response) => response.json())
    .catch((error) => {
      overviewLog("Error loading court codes:", error);
      return {};
    });

  // Set up column indices
  const headerRow = casesTable.find("thead tr").first();
  
  // Find case type column first since we need it for checking case eligibility
  const caseTypeColumnIndex = headerRow
    .find("th")
    .toArray()
    .findIndex((th) => $(th).text().trim() === "Case Type");
  
  // Find or create assessment columns
  let expungementColumnIndex = headerRow
    .find("th")
    .toArray()
    .findIndex((th) => $(th).text().trim() === "Expungement Assessment");
    
  let warrantColumnIndex = headerRow
    .find("th")
    .toArray()
    .findIndex((th) => $(th).text().trim() === "Warrant Status");

  // Add columns if needed
  let columnsAppended = 0;
  if (expungementColumnIndex === -1) {
    headerRow.append($("<th/>", {
      text: "Expungement Assessment",
      class: "iceDatTblColHdr2 dataColHdr2 dataHdr",
      scope: "col",
      id: "expungement-status-header"
    }));
    expungementColumnIndex = headerRow.find("th").length - 1;
    columnsAppended += 1;
  }

  if (warrantColumnIndex === -1) {
    headerRow.append($("<th/>", {
      text: "Warrant Status",
      class: "iceDatTblColHdr2 dataColHdr2 dataHdr",
      scope: "col",
      id: "warrant-status-header"
    }));
    warrantColumnIndex = headerRow.find("th").length - 1;
    columnsAppended += 1;
  }

  casesTable.find("tbody tr").each(function() {
    const $row = $(this);
    const $caseLink = $row.find('[id*="caseIdLink"]');
    
    // Skip rows without case links (e.g., button row at the end)
    if ($caseLink.length) {
      const caseNumber = $caseLink.text().trim();

      // Get case type from the correct column index
      const caseType = caseTypeColumnIndex >= 0 ? 
      $row.find(`td:eq(${caseTypeColumnIndex})`).text().trim() : null;

      console.log(`Processing case ${caseNumber} with type ${caseType}`);
      
      // Add or get expungement cell
      let $expungementCell = $row.find(`td:eq(${expungementColumnIndex})`);
      if (!$expungementCell.length) {
        $row.append($("<td/>", { class: "expungement-status-cell" }));
        $expungementCell = $row.find("td:last");
      }
    
      // Add or get warrant cell  
      let $warrantCell = $row.find(`td:eq(${warrantColumnIndex})`);
      if (!$warrantCell.length) {
        $row.append($("<td/>", { class: "warrant-status-cell" }));
        $warrantCell = $row.find("td:last");
      }
    
      const existingCase = existingCases.find(c => c.CaseNumber === caseNumber);
      if (existingCase) {
        // Update expungement status
        appendExistingCaseStatus(
          $expungementCell, 
          existingCase.Expungeable,
          existingCase.overallExpungeability?.explanation
        );
        
        // Update warrant status
        appendWarrantStatus(
          $warrantCell,
          existingCase.warrantStatus
        );
      } else if (isCaseTypeCheckable(caseNumber, caseType, eCourtCodes)) {
        casesToRetrieve.push(caseNumber);
        caseRowMap.set(caseNumber, $row);
        $expungementCell.css("background-color", "lemonchiffon").text("Retrieving...");
        $warrantCell.css("background-color", "lemonchiffon").text("Retrieving...");
      } else {
        $expungementCell.css("background-color", "#f8d7da").text(`Cannot check ${caseType}`);
        $warrantCell.css("background-color", "#f8d7da").text(`Cannot check ${caseType}`);
      }
    }
  });

  casesTable.find("tfoot tr td").each(function() {
    const $cell = $(this);
    const oldSpan = parseInt($cell.attr("colspan"), 10);
    if (oldSpan && columnsAppended > 0) {
      $cell.attr("colspan", oldSpan + columnsAppended);
    }
  });

  // Event handler for processing cases
  const caseProcessedHandler = async (event) => {
  const result = event.detail;
  console.log(`Processing case ${result.caseID}`);
  const $row = caseRowMap.get(result.caseID);
  if (!$row) return;

  // Get both status cells using column indices
  const $expungementCell = $row.find(`td:eq(${expungementColumnIndex})`);
  const $warrantCell = $row.find(`td:eq(${warrantColumnIndex})`);
  if (!$expungementCell.length && !$warrantCell.length) return;

  try {
    if (!result.html) {
      throw new Error("No HTML content received");
    }
    console.log(`HTML content length for case ${result.caseID}:`, result.html.length);

    const processor = CaseProcessorFactory.createProcessorFromHTML(result.html);
    if (!processor) {
      throw new Error("Could not create case processor");
    }
    console.log(`Created processor for case ${result.caseID}`);

    // Process case and log results
    await processor.process();
    console.log(`Completed initial processing for case ${result.caseID}`);
    
    const storageConfirmed = new Promise((resolve) => {
      const checkStorage = async (attempts = 0) => {
        if (attempts > 10) {
            console.warn(`Storage confirmation timed out for case ${result.caseID}`);
            resolve(false);
            return;
        }
    
        const cases = await safeGetCases();
        const storedCase = cases.find(c => c.CaseNumber === result.caseID);
        
        console.log(`Checking storage for case ${result.caseID} (attempt ${attempts + 1})`);
        if (storedCase?.charges.length > 0) {  // Check for completed processing
            console.log(`Charges found for case ${result.caseID}`);
            console.log(`Charges length: ${storedCase.charges.length}`);
            console.log(storedCase.charges)
            resolve(true);
        } else {
            console.log(`Charges not yet found for case ${result.caseID}`);
            setTimeout(() => checkStorage(attempts + 1), 100);
        }
    };
      
      checkStorage();
    });

    const isStored = await storageConfirmed;
    console.log(`Storage confirmed for case ${result.caseID}:`, isStored);
    
    if (isStored) {
      const cases = await safeGetCases();
      const processedCase = cases.find(c => c.CaseNumber === result.caseID);
      
      if (processedCase) {
        console.log(`Final status for case ${result.caseID}:`, processedCase.Expungeable);
        appendExistingCaseStatus(
          $expungementCell,
          processedCase.Expungeable,
          processedCase.overallExpungeability?.explanation
        );
        
        appendWarrantStatus(
          $warrantCell,
          processedCase.warrantStatus
        );
      }
    } else {
      throw new Error("Failed to confirm case storage");
    }
  } catch (error) {
    console.error(`Error processing case ${result.caseID}:`, error);
    $expungementCell
      .css("background-color", "pink")
      .text("Processing failed")
      .attr("title", error.message);
    $warrantCell
      .css("background-color", "pink")
      .text("Processing failed")
      .attr("title", error.message);
  }
};

  document.addEventListener("caseProcessed", caseProcessedHandler);

  if (casesToRetrieve.length > 0) {
    overviewLog(`Retrieving ${casesToRetrieve.length} new cases`);
    try {
      await retrieveAllAndReturn();
    } catch (error) {
      console.error("Error during batch retrieval:", error);
      for (const caseNumber of casesToRetrieve) {
        const $row = caseRowMap.get(caseNumber);
        if ($row) {
          const $expungementCell = $row.find("td.expungement-status-cell");
          const $warrantCell = $row.find("td.warrant-status-cell");
          
          if ($expungementCell.length) {
            $expungementCell
              .css("background-color", "pink")
              .text("Retrieval failed")
              .attr("title", "Error retrieving case data");
          }
          
          if ($warrantCell.length) {
            $warrantCell
              .css("background-color", "pink")
              .text("Retrieval failed")
              .attr("title", "Error retrieving case data");
          }
        }
      }
    } finally {
      document.removeEventListener("caseProcessed", caseProcessedHandler);
    }
  }

  initTooltips();
}

// Use case and court codes to determine if case type can be checked
function isCaseTypeCheckable(caseNumber, caseType, eCourtCodes) {
  //console.log("Inside isCaseTypeCheckable");
  const canHandleType = ["PC", "CC", "TC", "CW", "TA", "FC", "TI"];

  if (caseNumber) {
    //console.log("Case number and case type exist");
    caseNumberPrefix = caseNumber.replace(/^\d+/, "");
    caseNumberPrefix = caseNumberPrefix.split("-")[0];
    caseNumberPrefix = caseNumberPrefix.split(/\d/)[0];
    caseNumberPrefix = caseNumberPrefix.slice(-2);

    //console.log("caseNumberPrefix", caseNumberPrefix);
    if (canHandleType.includes(caseNumberPrefix)) {
      //console.log("caseNumberPrefix is in canHandleType");
      return true;
    }
    //console.log("caseNumberPrefix is not in canHandleType");
  }

  if (caseType && eCourtCodes) {
    //console.log("Case type and eCourtCodes exist");

    // Build lookup from eCourtCodes
    const lookup = Object.entries(eCourtCodes.case_type).reduce(
      (acc, [code, type]) => {
        if (acc[type]) {
          acc[type].push(code);
        } else {
          acc[type] = [code];
        }
        return acc;
      },
      {}
    );

    // Try to look up corresponding prefix. If more than one
    // (e.g., Traffic Crime), pick the first.
    const prefix = lookup[caseType]?.[0];
    //console.log("caseType", caseType);
    //console.log("prefix", prefix);
    if (prefix) {
      return canHandleType.includes(prefix);
    }
  }
  return false;
}

// Parse name line
function parseNameLine(nameLine) {
  try {
    const commaIndex = nameLine.indexOf(",");
    const lastName = nameLine.split(",")[0].split(":")[1].trim();
    const firstName = nameLine
      .substring(commaIndex + 2)
      .split(":")[1]
      .trim();
    return [lastName, firstName];
  } catch (error) {
    overviewLog("Error parsing name line. Using empty strings.");
    return ["", ""];
  }
}

// Initialize tooltips
function initTooltips() {
  if (
    typeof bootstrap !== "undefined" &&
    typeof bootstrap.Tooltip === "function"
  ) {
    const tooltipTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.map(
      (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
    );
  } else {
    console.warn(
      "Bootstrap Tooltip not available. Tooltips will not be initialized."
    );
  }
}

// Keep overviewListener in global scope
let overviewListener = null;

function initializeOverviewPage() {
  // Set up overview listener
  if (!overviewListener) {
    chrome.runtime.onMessage.removeListener(overviewListener);  // Clean up any existing
    
    overviewListener = (message, sender, sendResponse) => {
      if (message.action === "overview_page" && 
          document.querySelector("#frm\\:partyNameSearchResultsTableIntECC")) {
        overviewLog("Received overview_page action");
        processCases();
      }
    };
    chrome.runtime.onMessage.addListener(overviewListener);
  }

  // Initialize table observer
  // const observer = new MutationObserver(async (mutations, observer) => {
  //   const casesTable = document.querySelector("#frm\\:partyNameSearchResultsTableIntECC");
  //   if (casesTable) {
  //     observer.disconnect();  // Stop observing once we find the table
      
  //     // Get existing cases and update table without retrieving new ones
  //     const existingCases = await safeGetCases();
  //     if (existingCases.length > 0) {
  //       overviewLog("Table loaded, displaying existing cases");
  //       await processCaseTable(existingCases);
  //     }
  //   }
  // });
  // Initialize table observer
const observer = new MutationObserver(async (mutations, observer) => {
  const casesTable = document.querySelector("#frm\\:partyNameSearchResultsTableIntECC");
  if (casesTable) {
    observer.disconnect();  // Stop observing once we find the table

    // Get header row and add columns if needed
    const $table = $(casesTable);
    const headerRow = $table.find("thead tr").first();
    
    // Find case type column first since we need it for checking case eligibility
    const caseTypeColumnIndex = headerRow
      .find("th")
      .toArray()
      .findIndex((th) => $(th).text().trim() === "Case Type");
    
    // Add assessment columns if they don't exist
    let expungementColumnIndex = headerRow
      .find("th")
      .toArray()
      .findIndex((th) => $(th).text().trim() === "Expungement Assessment");
      
    let warrantColumnIndex = headerRow
      .find("th")
      .toArray()
      .findIndex((th) => $(th).text().trim() === "Warrant Status");

    if (expungementColumnIndex === -1) {
      headerRow.append($("<th/>", {
        text: "Expungement Assessment",
        class: "iceDatTblColHdr2 dataColHdr2 dataHdr",
        scope: "col",
        id: "expungement-status-header"
      }));
      expungementColumnIndex = headerRow.find("th").length - 1;
    }

    if (warrantColumnIndex === -1) {
      headerRow.append($("<th/>", {
        text: "Warrant Status",
        class: "iceDatTblColHdr2 dataColHdr2 dataHdr",
        scope: "col",
        id: "warrant-status-header"
      }));
      warrantColumnIndex = headerRow.find("th").length - 1;
    }

    // Load court codes for case type checking
    const eCourtCodes = await fetch(chrome.runtime.getURL("ecourt_kokua_codes.json"))
      .then((response) => response.json())
      .catch((error) => {
        overviewLog("Error loading court codes:", error);
        return {};
      });

    // Get existing cases
    const existingCases = await safeGetCases();

    // Process each row
    $table.find("tbody tr").each(function() {
      const $row = $(this);
      const $caseLink = $row.find('[id*="caseIdLink"]');
      
      if ($caseLink.length) {
        const caseNumber = $caseLink.text().trim();
        const caseType = caseTypeColumnIndex >= 0 ? 
          $row.find(`td:eq(${caseTypeColumnIndex})`).text().trim() : null;

        // Add or get cells
        let $expungementCell = $row.find(`td:eq(${expungementColumnIndex})`);
        if (!$expungementCell.length) {
          $row.append($("<td/>", { class: "expungement-status-cell" }));
          $expungementCell = $row.find("td:last");
        }

        let $warrantCell = $row.find(`td:eq(${warrantColumnIndex})`);
        if (!$warrantCell.length) {
          $row.append($("<td/>", { class: "warrant-status-cell" }));
          $warrantCell = $row.find("td:last");
        }

        const existingCase = existingCases.find(c => c.CaseNumber === caseNumber);
        if (existingCase) {
          // Show existing data
          appendExistingCaseStatus(
            $expungementCell,
            existingCase.Expungeable,
            existingCase.overallExpungeability?.explanation
          );
          
          appendWarrantStatus(
            $warrantCell,
            existingCase.warrantStatus
          );
        } else if (isCaseTypeCheckable(caseNumber, caseType, eCourtCodes)) {
          // Can check but haven't yet
          $expungementCell
            .css("background-color", "lightgray")
            .text("Need to check")
            .attr("title", "Click 'Check Overview Page' to evaluate");
          $warrantCell
            .css("background-color", "lightgray")
            .text("Need to check")
            .attr("title", "Click 'Check Overview Page' to evaluate");
        } else {
          // Cannot check this case type
          $expungementCell
            .css("background-color", "#f8d7da")
            .text(`Cannot check ${caseType}`)
            .attr("title", "This case type is not supported");
          $warrantCell
            .css("background-color", "#f8d7da")
            .text(`Cannot check ${caseType}`)
            .attr("title", "This case type is not supported");
        }
      }
    });

    // Update footer colspan
    $table.find("tfoot tr td").each(function() {
      const $cell = $(this);
      const oldSpan = parseInt($cell.attr("colspan"), 10);
      if (oldSpan) {
        const newColumns = (expungementColumnIndex === -1 ? 1 : 0) + 
                          (warrantColumnIndex === -1 ? 1 : 0);
        $cell.attr("colspan", oldSpan + newColumns);
      }
    });
  }
});

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize everything when the script loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeOverviewPage);
} else {
  initializeOverviewPage();
}