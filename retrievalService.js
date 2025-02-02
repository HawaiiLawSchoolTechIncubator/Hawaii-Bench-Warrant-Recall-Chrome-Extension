// retrievalService.js
function retrieveRecord(caseID, action = 'log') {
    // 1. Identify the form element and search page type
    const form = document.forms["frm"];
    const pageTitle = document.querySelector('.main-content-pagetitle').textContent;
    console.log(`Search results type: ${pageTitle}`);

    // 2. Set hidden fields
    if (pageTitle === "Case Search Results") {
        form["frm:j_idcl"].value = "frm:searchResultsTable:0:caseIdLink";
    } else if (pageTitle === "Name Search") {
        form["frm:j_idcl"].value = "frm:partyNameSearchResultsTableIntECC:0:caseIdLink";
    }

    form["caseID"].value = caseID;

    // 3. Build a FormData object
    const formData = new FormData(form);

    // 4. Send the POST request
    return fetch(form.action, {
        method: "POST",
        body: formData,
        credentials: "include"
    })
    .then(response => response.text())
    .then(responseText => {
        if (action === 'log') {
            console.log("Response from server:", responseText);
            return responseText;
        } else if (action === 'return') {
            return responseText;
        } else {
            console.error("Invalid action:", action);
            return null;
        }
    })
    .catch(error => {
        console.error("Error:", error);
        return null;
    })
    .finally(() => {
        // 5. Clear the hidden fields
        form["frm:j_idcl"].value = "";
        form["caseID"].value = "";
    });
}

async function retrieveAllAndReturn() {
    console.log("Starting retrieveAllAndReturn");
    const results = [];
    const caseIDLinks = document.querySelectorAll('[id*="caseIdLink"]');
    
    for (const link of caseIDLinks) {
        const caseID = link.textContent.trim();
        console.log(`Retrieving record for case ID: ${caseID}...`);
        
        try {
            const htmlResponse = await retrieveRecord(caseID, 'return');
            
            // Emit result immediately for each case
            const result = {
                caseID,
                html: htmlResponse
            };
            results.push(result);

            // Dispatch custom event with the result
            const resultEvent = new CustomEvent('caseProcessed', { 
                detail: result 
            });
            document.dispatchEvent(resultEvent);
            
        } catch (error) {
            console.error(`Error retrieving case ${caseID}:`, error);
            // Still dispatch event but with error info
            const resultEvent = new CustomEvent('caseProcessed', {
                detail: {
                    caseID,
                    error: error.message
                }
            });
            document.dispatchEvent(resultEvent);
        }
    }
    
    return results;
}