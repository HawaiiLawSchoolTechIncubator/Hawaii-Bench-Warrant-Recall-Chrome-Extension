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

  // Update the span inside the cell instead of the cell directly
  const $span = $cell.find('.iceOutTxt');
  if (!$span.length) {
    $cell.html('<span class="iceOutTxt"></span>');
  }
  
  $cell.css("background-color", bgColor)
       .attr("data-bs-toggle", "tooltip")
       .attr("data-bs-placement", "top")
       .attr("title", explanation || "No explanation available");
  
  $cell.find('.iceOutTxt').text(status || "");
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
    text =
      warrantStatus.latestWarrantType === "penal summons"
        ? "Outstanding Summons"
        : "Outstanding Warrant";
  } else if (warrantStatus.warrantEntries?.length > 0) {
    bgColor = "lightgreen";
    text = "No Outstanding Warrant";
  } else {
    bgColor = "white";
    text = "";
  }

  tooltip =
    warrantStatus?.explanation ||
    noWarrantTooltip ||
    "No explanation available";

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
async function processCaseTable(existingCases, retrieveNewCases = true) {
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
  const eCourtCodes = await fetch(
    chrome.runtime.getURL("ecourt_kokua_codes.json")
  )
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
    headerRow.append(
      $("<th/>", {
        text: "Expungement Assessment",
        class: "iceDatTblColHdr2 dataColHdr2 dataHdr",
        scope: "col",
        id: "expungement-status-header",
      })
    );
    expungementColumnIndex = headerRow.find("th").length - 1;
    columnsAppended += 1;
  }

  if (warrantColumnIndex === -1) {
    headerRow.append(
      $("<th/>", {
        text: "Warrant Status",
        class: "iceDatTblColHdr2 dataColHdr2 dataHdr",
        scope: "col",
        id: "warrant-status-header",
      })
    );
    warrantColumnIndex = headerRow.find("th").length - 1;
    columnsAppended += 1;
  }

  casesTable.find("tbody tr").each(function () {
    const $row = $(this);
    const $caseLink = $row.find('[id*="caseIdLink"]');
    const parentTdText = $caseLink.parent().text();
    const redacted = parentTdText.includes("Redacted"); // Redacted cases not available

    // Skip rows without case links (e.g., button row at the end)
    if ($caseLink.length) {
      const caseNumber = $caseLink.text().trim();

      // Get case type from the correct column index
      const caseType =
        caseTypeColumnIndex >= 0
          ? $row.find(`td:eq(${caseTypeColumnIndex})`).text().trim()
          : null;

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

      const existingCase = existingCases.find(
        (c) => c.CaseNumber === caseNumber
      );
      if (existingCase) {
        // Update expungement status
        appendExistingCaseStatus(
          $expungementCell,
          existingCase.Expungeable,
          existingCase.overallExpungeability?.explanation
        );

        // Update warrant status
        appendWarrantStatus($warrantCell, existingCase.warrantStatus);
      } else if (
        isCaseTypeCheckable(caseNumber, caseType, eCourtCodes, redacted)
      ) {
        casesToRetrieve.push(caseNumber);
        caseRowMap.set(caseNumber, $row);
        if (retrieveNewCases) {
          $expungementCell
            .css("background-color", "lemonchiffon")
            .text("Retrieving...");
          $warrantCell
            .css("background-color", "lemonchiffon")
            .text("Retrieving...");
        } else {
          $expungementCell
            .css("background-color", "lightgray")
            .text("Need to check")
            .attr("title", "Click 'Check Overview Page' to evaluate");
          $warrantCell
            .css("background-color", "lightgray")
            .text("Need to check")
            .attr("title", "Click 'Check Overview Page' to evaluate");
        }
      } else if (redacted) {
        $expungementCell
          .css("background-color", "#f8d7da")
          .text("Cannot check redacted cases");
        $warrantCell
          .css("background-color", "#f8d7da")
          .text("Cannot check redacted cases");
      } else {
        $expungementCell
          .css("background-color", "#f8d7da")
          .text(`Cannot check ${caseType}`);
        $warrantCell
          .css("background-color", "#f8d7da")
          .text(`Cannot check ${caseType}`);
      }
    }
  });

  casesTable.find("tfoot tr td").each(function () {
    const $cell = $(this);
    const oldSpan = parseInt($cell.attr("colspan"), 10);
    if (oldSpan && columnsAppended > 0) {
      $cell.attr("colspan", oldSpan + columnsAppended);
    }
  });

  // Called to populate existing cases only
  if(!retrieveNewCases) {
    return;
  }


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
      console.log(
        `HTML content length for case ${result.caseID}:`,
        result.html.length
      );
      //console.log(result.html)

      const processor = CaseProcessorFactory.createProcessorFromHTML(
        result.html
      );
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
            console.warn(
              `Storage confirmation timed out for case ${result.caseID}`
            );
            resolve(false);
            return;
          }

          const cases = await safeGetCases();
          const storedCase = cases.find((c) => c.CaseNumber === result.caseID);

          console.log(
            `Checking storage for case ${result.caseID} (attempt ${
              attempts + 1
            })`
          );
          if (storedCase?.charges.length > 0) {
            // Check for completed processing
            console.log(`Charges found for case ${result.caseID}`);
            console.log(`Charges length: ${storedCase.charges.length}`);
            console.log(storedCase.charges);
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
        const processedCase = cases.find((c) => c.CaseNumber === result.caseID);

        if (processedCase) {
          console.log(
            `Final status for case ${result.caseID}:`,
            processedCase.Expungeable
          );
          appendExistingCaseStatus(
            $expungementCell,
            processedCase.Expungeable,
            processedCase.overallExpungeability?.explanation
          );

          appendWarrantStatus($warrantCell, processedCase.warrantStatus);
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
function isCaseTypeCheckable(caseNumber, caseType, eCourtCodes, redacted) {
  // Checks both prefix and case type string because sometimes they disagree.
  // (Due to data entry error?)
  // Currently: prioritizes case type string result

  // Redacted cases cannot be checked
  if (redacted) {
    return false;
  }

  //console.log("Inside isCaseTypeCheckable");
  const canHandleType = ["PC", "CC", "TC", "CW", "TA", "FC", "TI"];
  let prefixTypeCheckable = false; // Whether prefix indicates case is checkable
  // E.g., "1DTI-..." checkable b/c "TI"
  let caseTypeStringCheckable = false; // Whether string in Case Type column corresponds
  // to a checkable prefix

  if (caseNumber) {
    //console.log("Case number and case type exist");
    caseNumberPrefix = caseNumber.replace(/^\d+/, "");
    caseNumberPrefix = caseNumberPrefix.split("-")[0];
    caseNumberPrefix = caseNumberPrefix.split(/\d/)[0];
    caseNumberPrefix = caseNumberPrefix.slice(-2);

    //console.log("caseNumberPrefix", caseNumberPrefix);
    if (canHandleType.includes(caseNumberPrefix)) {
      //console.log("caseNumberPrefix is in canHandleType");
      prefixTypecheckable = true;
      //return true;
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
      caseTypeStringCheckable = canHandleType.includes(prefix);
      //return canHandleType.includes(prefix);
    }
    return caseTypeStringCheckable;
  }
  return prefixTypeCheckable; // Return prefix result if only prefix available
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
let initialSetupComplete = false;

function initializeOverviewPage() {
  if (!overviewListener) {
    chrome.runtime.onMessage.removeListener(overviewListener);
    overviewListener = (message, sender, sendResponse) => {
      if (
        message.action === "overview_page" &&
        document.querySelector("#frm\\:partyNameSearchResultsTableIntECC")
      ) {
        overviewLog("Received overview_page action");
        processCases();
      }
    };
    chrome.runtime.onMessage.addListener(overviewListener);
  }

  // Function to update table after pagination
  async function handlePaginationUpdate() {
    overviewLog("Handling pagination update");
    const table = document.querySelector("#frm\\:partyNameSearchResultsTableIntECC");
    if (!table) return;

    // Get existing cases
    const cases = await safeGetCases();
    await processCaseTable(cases, false);
  }

  // Function to add click handlers to pagination controls
  function setupPaginationHandlers() {
    const table = document.querySelector("#frm\\:partyNameSearchResultsTableIntECC");
    if (!table) return;

    // Common selector for all pagination elements
    const paginationSelector = 'a[id*="results_page_scroller"]';
    
    // Remove any existing handlers first
    $(document).off('click.pagination', paginationSelector);

    // Add new handler that triggers after ICEfaces completes its update
    $(document).on('click.pagination', paginationSelector, function(e) {
      // Use a small delay to ensure ICEfaces has completed its update
      setTimeout(handlePaginationUpdate, 500);
    });

    overviewLog("Pagination handlers set up");
  }

  // Set up mutation observer to watch for initial table build
  const tableObserver = new MutationObserver(async (mutations) => {
    if (initialSetupComplete) return;

    const casesTable = document.querySelector("#frm\\:partyNameSearchResultsTableIntECC");
    if (!casesTable) return;

    const headerRow = casesTable.querySelector('thead tr');
    if (!headerRow) return;

    const hasExpungement = Array.from(headerRow.cells).some(
      cell => cell.textContent.trim() === "Expungement Assessment"
    );
    const hasWarrant = Array.from(headerRow.cells).some(
      cell => cell.textContent.trim() === "Warrant Status"
    );

    // If our columns don't exist yet but the table is ready
    if (!hasExpungement && !hasWarrant && casesTable.querySelector('tbody tr td')) {
      const cases = await safeGetCases();
      await processCaseTable(cases, false);
      initialSetupComplete = true;
      setupPaginationHandlers(); // Set up pagination handlers after initial build
    }
  });

  // Watch for table changes
  tableObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Set up pagination handlers initially (in case table is already present)
  setupPaginationHandlers();
}

// Initialize everything when the script loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeOverviewPage);
} else {
  initializeOverviewPage();
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
// // Keep overviewListener in global scope
// let overviewListener = null;

// function initializeOverviewPage() {
//   if (!overviewListener) {
//     chrome.runtime.onMessage.removeListener(overviewListener);
//     overviewListener = (message, sender, sendResponse) => {
//       if (
//         message.action === "overview_page" &&
//         document.querySelector("#frm\\:partyNameSearchResultsTableIntECC")
//       ) {
//         overviewLog("Received overview_page action");
//         processCases();
//       }
//     };
//     chrome.runtime.onMessage.addListener(overviewListener);
//   }

//   // Function to update table after pagination
//   async function handlePaginationUpdate() {
//     overviewLog("Handling pagination update");
//     const table = document.querySelector("#frm\\:partyNameSearchResultsTableIntECC");
//     if (!table) return;

//     // Get existing cases
//     const cases = await safeGetCases();
//     await processCaseTable(cases, false);
//   }

//   // Function to add click handlers to pagination controls
//   function setupPaginationHandlers() {
//     const table = document.querySelector("#frm\\:partyNameSearchResultsTableIntECC");
//     if (!table) return;

//     // Common selector for all pagination elements
//     const paginationSelector = 'a[id*="results_page_scroller"]';
    
//     // Remove any existing handlers first
//     $(document).off('click.pagination', paginationSelector);

//     // Add new handler that triggers after ICEfaces completes its update
//     $(document).on('click.pagination', paginationSelector, function(e) {
//       // Use a small delay to ensure ICEfaces has completed its update
//       setTimeout(handlePaginationUpdate, 500);
//     });

//     overviewLog("Pagination handlers set up");
//   }

//   // Set up mutation observer to watch for table changes
//   const observer = new MutationObserver((mutations) => {
//     const tableChanged = mutations.some(mutation => {
//       return mutation.target.id === "frm:partyNameSearchResultsTableIntECC" ||
//              mutation.target.closest("#frm\\:partyNameSearchResultsTableIntECC");
//     });

//     if (tableChanged) {
//       // Re-setup pagination handlers whenever the table changes
//       setupPaginationHandlers();
//     }
//   });

//   observer.observe(document.body, {
//     childList: true,
//     subtree: true
//   });

//   // Initial setup
//   setupPaginationHandlers();
// }

// // Initialize everything when the script loads
// if (document.readyState === "loading") {
//   document.addEventListener("DOMContentLoaded", initializeOverviewPage);
// } else {
//   initializeOverviewPage();
// }

///////////////////////////////////////////////////////////////////////////////////////////
// // Keep overviewListener in global scope
// let overviewListener = null;

// function initializeOverviewPage() {
//   if (!overviewListener) {
//     chrome.runtime.onMessage.removeListener(overviewListener);
//     overviewListener = (message, sender, sendResponse) => {
//       if (
//         message.action === "overview_page" &&
//         document.querySelector("#frm\\:partyNameSearchResultsTableIntECC")
//       ) {
//         overviewLog("Received overview_page action");
//         processCases();
//       }
//     };
//     chrome.runtime.onMessage.addListener(overviewListener);
//   }

//   let lastFirstCaseId = null;

//   const observer = new MutationObserver(async (mutations) => {
//     const casesTable = document.querySelector(
//       "#frm\\:partyNameSearchResultsTableIntECC"
//     );
    
//     if (!casesTable) return;

//     // Get the first case ID in the current table
//     const firstCaseLink = casesTable.querySelector('[id*="caseIdLink"]');
//     const currentFirstCaseId = firstCaseLink ? firstCaseLink.textContent.trim() : null;

//     // Check if the table content has changed by comparing first case IDs
//     if (currentFirstCaseId && currentFirstCaseId !== lastFirstCaseId) {
//       overviewLog(`Table content changed. Previous first case: ${lastFirstCaseId}, Current first case: ${currentFirstCaseId}`);
//       lastFirstCaseId = currentFirstCaseId;
      
//       const cases = await safeGetCases();
//       await processCaseTable(cases, false);
//     }
//   });

//   // Observe both the entire document body for table addition/removal
//   // and the table itself for content changes when it exists
//   observer.observe(document.body, {
//     childList: true,
//     subtree: true,
//     characterData: true
//   });
// }

// // Initialize everything when the script loads
// if (document.readyState === "loading") {
//   document.addEventListener("DOMContentLoaded", initializeOverviewPage);
// } else {
//   initializeOverviewPage();
// }