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

// Use case and court codes to determine if case type can be
// checked for expungement/warrant status
function isCaseTypeCheckable(caseNumber, caseType, eCourtCodes) {
  const canHandleType = ["CPC", "PC", "DCC", "DTC", "DCW", "DTA", "FFC", "DTI"];
  
  if (canHandleType.some((prefix) => caseNumber.includes(prefix))) {
    return true;
  } else if (caseType && eCourtCodes) {
    // Get last two characters of caseType
    const caseTypeCode = caseType.slice(-2);

    // Build lookup from eCourtCodes. eCourtCodes is an object
    // with the following structure:
    // {
    //   ...other keys...
    //   "case_type": {
    //     "AA": "Appeal to Cir, Dist, Fam Court",
          // "AB": "Adult Abuse",
          // "TA": "Traffic Crime",
          // "TC": "Traffic Crime",
          // etc.
    // }
    // lookup should reverse this structure, e.g.,
    // {
    //   "Appeal to Cir, Dist, Fam Court": ["AA"],
    //   "Adult Abuse": ["AB"],
    //   "Traffic Crime": ["TA", "TC"],
    //   etc.
    // }

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
    
    // Try to look up corresponding prefix. If more than one (e.g., Traffic Crime),
    // pick the first.
    const prefix = lookup[caseTypeCode]?.[0];
    if (prefix) {
      return canHandleType.includes(prefix);
    }
  }
  return false;
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

  // Load the case and court code lookup data stored
  // in ecourt_kokua_codes.json in the extension's root folder
  const eCourtCodes = await fetch(chrome.runtime.getURL("ecourt_kokua_codes.json"))
    .then((response) => response.json())
    .catch((error) => {
      overviewLog("Error loading court codes:", error);
      return {};
    });
  overviewLog("eCourtCodes:", eCourtCodes);

  // Helper function to check header state
  const logHeaderState = (location) => {
    const header = $("#check-status-header");
    const allHeaders = casesTable.find("thead tr:first th");
    // overviewLog(`Header check at ${location}:`);
    // overviewLog(`- Header exists: ${header.length > 0}`);
    // overviewLog(`- Total headers: ${allHeaders.length}`);
    // overviewLog(`- Last header text: "${allHeaders.last().text()}"`);
  };

  // Set up status column
  const headerRow = casesTable.find("thead tr").first();
  let statusColumnIndex = headerRow
    .find("th")
    .toArray()
    .findIndex((th) => $(th).text().trim() === "Expungement Assessment");

  logHeaderState("Before header setup");

  if (statusColumnIndex === -1) {
    const statusHeader = $("<th/>", {
      text: "Expungement Assessment",
      class: "iceDatTblColHdr2 dataColHdr2 dataHdr",
      scope: "col",
      id: "check-status-header",
    }).appendTo(headerRow);

    statusColumnIndex = headerRow.find("th").length - 1;
    logHeaderState("After header addition");

    // Update footer colspan
    casesTable.find("tfoot tr td").each(function () {
      const $cell = $(this);
      const oldSpan = parseInt($cell.attr("colspan"), 10);
      if (oldSpan) $cell.attr("colspan", oldSpan + 1);
    });
  }

  // Find "Case Type" column (needed for case type check if case number 
  // is in the old format lacking prefixes like "CPC", "DCC", etc.)
  let caseTypeColumnIndex = headerRow
    .find("th")
    .toArray()
    .findIndex((th) => $(th).text().trim() === "Case Type");


  // First pass
  const casesToRetrieve = [];
  const caseRowMap = new Map();

  casesTable.find("tbody tr").each(function () {
    const $row = $(this);
    const $caseLink = $row.find('[id*="caseIdLink"]');
    const caseNumber = $caseLink.text().trim();
    const caseType = caseTypeColumnIndex >= 0 ? $row.find("td:eq(" + caseTypeColumnIndex + ")").text().trim() : null;

    let $statusCell = $row.find(`td:eq(${statusColumnIndex})`);
    if (!$statusCell.length) {
      $row.append(
        $("<td/>", {
          class: "status-cell",
        })
      );
      $statusCell = $row.find("td:last");
    }

    const existingCase = existingCases.find((c) => c.CaseNumber === caseNumber);
    if (existingCase) {
      appendExistingCaseStatus(
        $statusCell,
        existingCase.Expungeable,
        existingCase.overallExpungeability?.explanation
      );
    //} else if (/CPC|DCC|DTC|DCW|DTA|FFC|DTI/i.test(caseNumber)) {
    } else if (isCaseTypeCheckable(caseNumber, caseType, eCourtCodes)) {
      casesToRetrieve.push(caseNumber);
      caseRowMap.set(caseNumber, $row);
      $statusCell.css("background-color", "lightgray").text("Retrieving...");
    } else {
      $statusCell.css("background-color", "white").text("");
    }
  });

  logHeaderState("After first pass");

  // Event handler for processing cases
  const caseProcessedHandler = async (event) => {
    const result = event.detail;
    const $row = caseRowMap.get(result.caseID);
    if (!$row) return;

    const $statusCell = $row.find("td.status-cell");
    if (!$statusCell.length) return;

    try {
      if (!result.html) {
        throw new Error("No HTML content received");
      }

      const processor = CaseProcessorFactory.createProcessorFromHTML(
        result.html
      );
      if (!processor) {
        throw new Error("Could not create case processor");
      }

      await processor.process();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const cases = await safeGetCases();
      const processedCase = cases.find((c) => c.CaseNumber === result.caseID);

      if (processedCase) {
        // Check if header still exists before updating cell
        if (!$("#check-status-header").length) {
          // Re-add header if it's missing
          const headerRow = casesTable.find("thead tr").first();
          headerRow.append(
            $("<th/>", {
              text: "Expungement Assessment",
              class: "iceDatTblColHdr2 dataColHdr2 dataHdr",
              scope: "col",
              id: "check-status-header",
            })
          );
        }

        // Update the cell content
        appendExistingCaseStatus(
          $statusCell,
          processedCase.Expungeable,
          processedCase.overallExpungeability?.explanation
        );
      } else {
        setTimeout(async () => {
          const updatedCases = await safeGetCases();
          const updatedCase = updatedCases.find(
            (c) => c.CaseNumber === result.caseID
          );
          if (updatedCase) {
            // Check header again before delayed update
            if (!$("#check-status-header").length) {
              const headerRow = casesTable.find("thead tr").first();
              headerRow.append(
                $("<th/>", {
                  text: "Expungement Assessment",
                  class: "iceDatTblColHdr2 dataColHdr2 dataHdr",
                  scope: "col",
                  id: "check-status-header",
                })
              );
            }

            appendExistingCaseStatus(
              $statusCell,
              updatedCase.Expungeable,
              updatedCase.overallExpungeability?.explanation
            );
          }
        }, 500);
      }
    } catch (error) {
      console.error(`Error processing case ${result.caseID}:`, error);
      if (!result.html || !processor) {
        $statusCell
          .css("background-color", "pink")
          .text("Processing failed")
          .attr("title", error.message);
      }
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
          const $statusCell = $row.find("td.status-cell");
          $statusCell
            .css("background-color", "pink")
            .text("Retrieval failed")
            .attr("title", "Error retrieving case data");
        }
      }
    } finally {
      document.removeEventListener("caseProcessed", caseProcessedHandler);
      logHeaderState("After all processing complete");
    }
  }

  initTooltips();
}

// Use case and court codes to determine if case type can be checked
function isCaseTypeCheckable(caseNumber, caseType, eCourtCodes) {
  console.log("Inside isCaseTypeCheckable");
  const canHandleType = ["PC", "CC", "TC", "CW", "TA", "FC", "TI"];

  if (caseNumber) {
    //console.log("Case number and case type exist");
    caseNumberPrefix = caseNumber.replace(/^\d+/, "");
    caseNumberPrefix = caseNumberPrefix.split("-")[0];
    caseNumberPrefix = caseNumberPrefix.split(/\d/)[0];
    caseNumberPrefix = caseNumberPrefix.slice(-2);

    console.log("caseNumberPrefix", caseNumberPrefix);
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
    console.log("caseType", caseType);
    console.log("prefix", prefix);
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

// Start the script
if (document.querySelector("#frm\\:partyNameSearchResultsTableIntECC")) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "overview_page") {
      processCases();
    }
  });
}

// In overview.js - add message listener at the end of the file
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "overview_page") {
    overviewLog("Received overview_page action");
    processCases();
  }
});
