// Logging utility
const log = (message) => console.log(`[overview.js] ${message} - ${new Date().toISOString()}`);

log('Script started');

// Flag to indicate if we're currently processing
let isProcessing = false;

// Wrapper functions to handle potential asynchronous nature of global functions
async function safeGetCases() {
    return new Promise((resolve, reject) => {
        const checkFunction = () => {
            if (typeof getCases === 'function') {
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
            if (typeof getClient === 'function') {
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
            if (typeof saveClientToChromeLocalStorage === 'function') {
                const result = saveClientToChromeLocalStorage(firstname, lastname);
                resolve(result instanceof Promise ? result : Promise.resolve(result));
            } else {
                setTimeout(checkFunction, 100);
            }
        };
        checkFunction();
    });
}

// Process case table
async function processCases() {
    if (isProcessing) {
        log('Already processing, skipping this call');
        return;
    }

    log('Processing cases');
    try {
        isProcessing = true;
        const cases = await safeGetCases();
        const client = await safeGetClient();
        log(`Retrieved ${cases.length} cases and client info`);

        const nameElement = $('#frm\\:j_idt67');
        if (nameElement.length) {
            const nameLine = nameElement.text();
            const [lastName, firstName] = parseNameLine(nameLine);
            log(`Parsed name: ${firstName} ${lastName}`);
            await safeSaveClientToChromeLocalStorage(firstName, lastName);
        }

        const casesTable = $('#frm\\:partyNameSearchResultsTableIntECC');
        if (casesTable.length) {
            processCaseTable(cases);
        } else {
            log('Cases table not found, waiting for it to appear');
        }
    } catch (error) {
        console.error("Failed to process cases:", error);
    } finally {
        isProcessing = false;
    }
}

// Initialize tooltips
function initTooltips() {
    if (typeof bootstrap !== 'undefined' && typeof bootstrap.Tooltip === 'function') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    } else {
        console.warn('Bootstrap Tooltip not available. Tooltips will not be initialized.');
    }
}


function processCaseTable(cases) {
    log('Processing case table');
    const casesTable = $('#frm\\:partyNameSearchResultsTableIntECC');
    if (!casesTable.length) {
        log('Case table not found');
        return;
    }

    isProcessing = true;

    // Find or create "Check Status" column
    let statusColumnIndex = -1;
    const headerRow = casesTable.find('thead tr');
    headerRow.find('th').each(function(index) {
        if ($(this).text().trim() === "Check Status") {
            statusColumnIndex = index;
            return false;  // break the loop
        }
    });

    if (statusColumnIndex === -1) {
        // Add "Check Status" column if it doesn't exist
        headerRow.append('<th>Check Status</th>');
        statusColumnIndex = headerRow.find('th').length - 1;
    }

    // Process each row in the table body
    casesTable.find('tbody tr').each(function() {
        processCaseRow($(this), cases, statusColumnIndex);
    });

    log(`Processed ${casesTable.find('tbody tr').length} rows`);
    isProcessing = false;
}

// Process individual case row
function processCaseRow($row, cases, statusColumnIndex) {
    const caseNumber = $row.find('td:nth-child(2) a').text().trim();
    if (caseNumber.length < 5) return;

    // Ensure the row has a cell for the status column
    let $statusCell = $row.find(`td:eq(${statusColumnIndex})`);
    if ($statusCell.length === 0) {
        // If the cell doesn't exist, append it
        $row.append('<td></td>');
        $statusCell = $row.find('td:last');
    }

    // Check if the cell has already been processed
    if ($statusCell.attr('data-status-processed')) {
        return; // Skip if already processed
    }

    const caseTypes = ['CPC', 'PC', 'DTC', 'DCW', 'DCC', 'DTA', 'FFC', 'DTI'];
    const needsCheck = caseTypes.some(type => caseNumber.includes(type));
    const existingCase = cases.find(caseItem => caseItem.CaseNumber === caseNumber);

    if (existingCase) {
        appendExistingCaseStatus($statusCell, existingCase.Expungeable, existingCase.overallExpungeability?.explanation);
    } else if (needsCheck) {
        $statusCell.css('background-color', 'lightgray').text('Need to Check');
    } else {
        $statusCell.css('background-color', 'white').text('');
    }

    $statusCell.attr('data-status-processed', 'true');
}

// Append status for existing case
function appendExistingCaseStatus($cell, status, explanation) {
    let normalizedStatus = status.toLowerCase();
    let color;
    if (normalizedStatus === "all expungeable") {
        color = "lightgreen";
    } else if (normalizedStatus === "not expungeable" || normalizedStatus === "none expungeable") {
        color = "lightcoral";
    } else if (normalizedStatus.includes("some expungeable")) {
        color = "lightyellow";
    } else if (normalizedStatus.includes("some possibly expungeable") || normalizedStatus.includes("all possibly expungeable") || normalizedStatus.includes("expungeable after")) {
        color = "orange";
    } else {
        color = "orange";
    }
    
    //$cell.css('background-color', color).text(status);
    $cell.css('background-color', color)
        .text(status)
        .attr('data-bs-toggle', 'tooltip')
        .attr('data-bs-placement', 'top')
        .attr('title', explanation || 'No explanation available');
}



// Main processing function
async function processCases() {
    if (isProcessing) {
        log('Already processing, skipping this call');
        return;
    }

    log('Processing cases');
    try {
        const cases = await safeGetCases();
        const client = await safeGetClient();
        log(`Retrieved ${cases.length} cases and client info`);

        const nameElement = $('#frm\\:j_idt67');
        if (nameElement.length) {
            const nameLine = nameElement.text();
            const [lastName, firstName] = parseNameLine(nameLine);
            log(`Parsed name: ${firstName} ${lastName}`);
            await safeSaveClientToChromeLocalStorage(firstName, lastName);
        }

        const casesTable = $('#frm\\:partyNameSearchResultsTableIntECC');
        if (casesTable.length) {
            processCaseTable(cases);
        } else {
            log('Cases table not found, waiting for it to appear');
        }

    } catch (error) {
        console.error("Failed to process cases:", error);
    }

    // Initialize tooltips
    initTooltips();
}

// Parse name line
function parseNameLine(nameLine) {
    try {
        const commaIndex = nameLine.indexOf(',');
        const lastName = nameLine.split(',')[0].split(':')[1].trim();
        const firstName = nameLine.substring(commaIndex + 2).split(':')[1].trim();
        return [lastName, firstName];
    } catch (error) {
        log("Error parsing name line. Using empty strings.");
        return ["", ""];
    }
}

// Observe the document for the addition of the cases table
function observeDocument() {
    const config = { childList: true, subtree: true };
    let observer;

    const callback = function(mutationsList, observer) {
        for(let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const casesTable = document.getElementById('frm:partyNameSearchResultsTableIntECC');
                if (casesTable) {
                    log('Cases table found. Processing cases...');
                    observer.disconnect();
                    processCases().then(() => {
                        observeCasesTable(casesTable);
                    });
                    break;
                }
            }
        }
    };

    observer = new MutationObserver(callback);
    observer.observe(document.body, config);
    log('MutationObserver set up for document body');
}

// Observe the cases table for changes
function observeCasesTable(table) {
    const config = { childList: true, subtree: true };
    let processingTimeout;

    const callback = function(mutationsList, observer) {
        if (isProcessing) {
            log('Mutation observed, but processing is ongoing. Skipping.');
            return;
        }

        clearTimeout(processingTimeout);
        processingTimeout = setTimeout(() => {
            log('Cases table changed. Processing cases...');
            processCases();
        }, 500);
    };

    const observer = new MutationObserver(callback);
    observer.observe(table, config);
    log('MutationObserver set up for cases table');
}

// Initialize script
function initScript() {
    log('Initializing script');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDOMReady);
    } else {
        onDOMReady();
    }
}

// Function to run when DOM is ready
async function onDOMReady() {
    log('DOM is ready');
    const casesTable = document.getElementById('frm:partyNameSearchResultsTableIntECC');
    if (casesTable) {
        await processCases();
        observeCasesTable(casesTable);
    } else {
        observeDocument();
    }

    // Set up event listener for search button
    $(document).on('click', '#frm\\:searchButtonIntECC', function() {
        log('Search button clicked');
    });
}

// Listen for AJAX complete message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "ajax_complete") {
        log("AJAX complete message received");
        setTimeout(async () => {
            if (!isProcessing) {
                await processCases();
            }
        }, 500); // Process cases after a short delay
    }
});

// Start the script
initScript();