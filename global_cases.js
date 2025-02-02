//Interacting with Chrome Storage to:
//1. Save the client's name
//2. Save the case number and its eligibility
//3. Get the client's name
//4. Get the cases

function getCases() {
    //Returns a object that contains all the cases from chrome storage
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(null, function (items) {
            var cases = items['cases'] ? items['cases'] : [];
            resolve(cases);
        });
    });
}
function getClient() {
    //Returns a object that contains the client's name from chrome storage
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(null, function(items) {
            var client = items['client'] ? items['client'] : {};
            resolve(client);
        });
    });
}

function saveClientToChromeLocalStorage(firstname, lastname) {
    //Add client name to local storage.
    chrome.storage.local.get(null, function (items) {

        console.log("Items:");
        console.dir(items);

        // Initialize the cases array
        var client = items['client'] ? items['client'] : [];
        console.log("Existing client");
        console.dir(client);

        // Define the new case object
        var client_temp = {
            'First Name': firstname,
            'Last Name': lastname
        };

        if (items['client'] === undefined) {
            chrome.storage.local.set({ 'client': client_temp }, function () {
                console.log("New client added.");
                chrome.runtime.sendMessage({"Client Name": client_temp});
            });
        }
        else {
            console.log("Client Already Exists.");
        }
    });
}
function saveToChromeLocalStorage(caseid, case_assessment, court_location, filing_date, defendant_name, caseDetails, override = false, overrideWarrant = false) {
    chrome.storage.local.get(null, function (items) {
        console.log("Items:");
        console.dir(items);

        // Initialize the cases array if it doesn't exist
        var cases = items['cases'] ? items['cases'] : [];
        console.log("Existing cases:");
        console.dir(cases);

        // Safely handle warrant serialization of warrant dates
        // NB: Chrome will otherwise store Date objects as empty objects!
        if (caseDetails?.warrantStatus?.warrantEntries) {
            caseDetails.warrantStatus.warrantEntries = caseDetails.warrantStatus.warrantEntries.map(entry => {
                if (entry?.date instanceof Date) {
                    return { ...entry, date: entry.date.toLocaleDateString() };
                }
                return entry;
            });
        }

        if (caseDetails?.warrantStatus?.latestWarrantDate instanceof Date) {
            caseDetails.warrantStatus.latestWarrantDate = caseDetails.warrantStatus.latestWarrantDate.toLocaleDateString();
        }

        if (caseDetails?.warrantStatus?.latestRecallDate instanceof Date) {
            caseDetails.warrantStatus.latestRecallDate = caseDetails.warrantStatus.latestRecallDate.toLocaleDateString();
        }

        if (caseDetails?.warrantStatus?.latestNonAppearanceDate instanceof Date) {
            caseDetails.warrantStatus.latestNonAppearanceDate = caseDetails.warrantStatus.latestNonAppearanceDate.toLocaleDateString();
        }
        
        // Define the new case object   
        var newCase = {
            'CaseNumber': caseid,
            'Expungeable': case_assessment,
            'CourtLocation': court_location,
            'FilingDate': filing_date,
            'DefendantName': defendant_name,
            'Override': override,
            'OverrideWarrant': overrideWarrant,
            ...caseDetails,
            'processingComplete': true
        };

        // Remove any cases with the same case number
        let filteredCases = cases.filter(caseItem => caseItem.CaseNumber !== newCase.CaseNumber);

        // Add the new case
        filteredCases.push(newCase);
        console.log(`Added/Updated case with caseNumber: ${newCase.CaseNumber}`);

        // Update the cases array
        cases = filteredCases;

        // Save the updated list of cases
        chrome.storage.local.set({ 'cases': cases }, function () {
            console.log("Cases saved to storage.");
            // Debug: Log the updated list of cases
            chrome.storage.local.get('cases', function (items) {
                console.log("Updated cases list:");
                console.dir(items['cases']);
            });
            //Send a message back to the popup.js so we can update the popup window
            chrome.runtime.sendMessage({"Assessment": case_assessment});
        });
    });
}