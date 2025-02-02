let currentMode = "expungement"; // Default mode (can be 'expungement' or 'warrant') 


/////////////////////// RETRIEVE AND ASSESS ALL FUNCTIONS ///////////////////////
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
  //    *** IMPORTANT: return the `fetch` promise here. ***
  return fetch(form.action, {
      method: "POST",
      body: formData,
      credentials: "include"
  })
  .then(response => response.text())
  .then(responseText => {
      if (action === 'log') {
          console.log("Response from server:", responseText);
          // Return the text anyway in case you want to use it
          // after the fact
          return responseText;
      } else if (action === 'return') {
          // Return the server's response as a string
          return responseText;
      } else {
          console.error("Invalid action:", action);
          return null; // or throw an error
      }
  })
  .catch(error => {
      console.error("Error:", error);
      return null;  // return null so the promise resolves
  })
  .finally(() => {
      // 5. Clear the hidden fields
      form["frm:j_idcl"].value = "";
      form["caseID"].value = "";
  });
}


async function retrieveAllAndReturn() {
  const results = [];
  const caseIDLinks = document.querySelectorAll('[id*="caseIdLink"]');
  
  for (const link of caseIDLinks) {
      const caseID = link.textContent.trim();

      console.log(`Retrieving record for case ID: ${caseID}...`);
      try {
          const htmlResponse = await retrieveRecord(caseID, 'return');
          results.push({
              caseID,
              html: htmlResponse
          });
          
          // Add a small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
          console.error(`Error retrieving case ${caseID}:`, error);
      }
  }
  
  return results;
}async function retrieveAllAndReturn() {
  const results = [];
  const caseIDLinks = document.querySelectorAll('[id*="caseIdLink"]');
  
  for (const link of caseIDLinks) {
      const caseID = link.textContent.trim();

      console.log(`Retrieving record for case ID: ${caseID}...`);
      try {
          const htmlResponse = await retrieveRecord(caseID, 'return');
          results.push({
              caseID,
              html: htmlResponse
          });
          
          // Add a small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
          console.error(`Error retrieving case ${caseID}:`, error);
      }
  }
  
  return results;
}

async function retrieveAllAndReturn() {
  const results = [];
  const caseIDLinks = document.querySelectorAll('[id*="caseIdLink"]');
  
  for (const link of caseIDLinks) {
      const caseID = link.textContent.trim();

      console.log(`Retrieving record for case ID: ${caseID}...`);
      try {
          const htmlResponse = await retrieveRecord(caseID, 'return');
          results.push({
              caseID,
              html: htmlResponse
          });
          
          // Add a small delay between requests (or not)
          //await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
          console.error(`Error retrieving case ${caseID}:`, error);
      }
  }
  
  return results;
}

/////////////////////// Storage Functions ///////////////////////
// Function to load mode from storage
function loadMode() {
  return new Promise((resolve) => {
    chrome.storage.local.get("toolMode", function (result) {
      currentMode = result.toolMode || "expungement";
      // Update UI to reflect current mode
      document.querySelector(`input[value="${currentMode}"]`).checked = true;
      resolve(currentMode);
    });
  });
}

// Function to save mode to storage
function saveMode(mode) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ toolMode: mode }, function () {
      currentMode = mode;
      resolve();
    });
  });
}

function getCases() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, function (items) {
      var cases = items["cases"] ? items["cases"] : [];
      console.log("Retrieved cases from storage:", cases);
      resolve(cases);
    });
  });
}
function getClient() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, function (items) {
      var client = items["client"] ? items["client"] : {};
      resolve(client);
    });
  });
}

// Clear in-memory data
function resetInMemoryState() {
  // Reset warrant details
  warrantDetails = {
    consultationDate: "",
    consultationTown: "",
    consultVerbPhrase: "",
    nonAppearanceDate: "",
    warrantIssueDate: "",
    warrantAmount: "",
    caseNumber: ""
  };

  // Reset attorney info
  attorneyInfo = {
    isPublicDefender: true,
    firmName: "",
    attorneyName: "",
    attorneyRegistration: "",
    attorneySignatureLocation: "",
    headPdName: "",
    headPdRegistration: "",
    attorneyAddress1: "",
    attorneyAddress2: "",
    attorneyAddress3: "",
    attorneyAddress4: "",
    attorneyTelephone: "",
    attorneyFax: "",
    attorneyEmail: "",
    circuitOrdinal: ""
  };

  // Reset alternate info
  alternateFirstName = "";
  alternateMiddleName = "";
  alternateLastName = "";
  alternateAddressLine1 = "";
  alternateAddressLine2 = "";
  alternateAddressLine3 = "";
  alternatePhone = "";
  alternateEmail = "";
  alternateDOB = "";
  alternateSex = "";
}

/////////////////////// Generate Documents Validation ///////////////////////
// FINAL DETERMINATION OF BENCH WARRANT STATUS TO DECIDE WHETHER TO GENERATE BENCH WARRANT PAPERWORK
function isWarrantStatusSufficientForPaperwork(warrantStatus, override, caseType) {
  console.log("Warrant status:", warrantStatus);
  console.log("Override:", override);

  // CANNOT HANDLE PENAL SUMMONS PAPERWORK AT THE MOMENT
  // After implementing, don't forget to update the tooltip text in displayCases (check the forceGenerateText variable)
  //return warrantStatus?.hasOutstandingWarrant || override;
  return (warrantStatus?.hasOutstandingWarrant && warrantStatus?.latestWarrantType != 'penal summons') || override;
}

// FINAL DETERMINATION OF EXPUNGEABILITY TO DECIDE WHETHER TO GENERATE EXPUNGEMENT PAPERWORK
function isExpungeableEnoughForPaperwork(expungeableStatus, override) {
  return (
    expungeableStatus === "All Expungeable" ||
    //expungeableStatus === "Some Expungeable" ||
    //expungeableStatus === "All Possibly Expungeable" ||
    override
  );
}

/////////////////////// Alternate Client Info ///////////////////////
let alternateFirstName = "";
let alternateMiddleName = "";
let alternateLastName = "";
let alternateSex = "";

function loadAlternateInfo() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [
        "alternateFirstName",
        "alternateMiddleName",
        "alternateLastName",
        "alternateAddressLine1",
        "alternateAddressLine2",
        "alternateAddressLine3",
        "alternatePhone",
        "alternateEmail",
        "alternateDOB",
        "alternateSex",
      ],
      function (result) {
        alternateFirstName = result.alternateFirstName || "";
        alternateMiddleName = result.alternateMiddleName || "";
        alternateLastName = result.alternateLastName || "";
        alternateAddressLine1 = result.alternateAddressLine1 || "";
        alternateAddressLine2 = result.alternateAddressLine2 || "";
        alternateAddressLine3 = result.alternateAddressLine3 || "";
        alternatePhone = result.alternatePhone || "";
        alternateEmail = result.alternateEmail || "";
        alternateDOB = result.alternateDOB || "";
        alternateSex = result.alternateSex || "";
        resolve();
      }
    );
  });
}

// Function to save alternate names and address to Chrome storage
function saveAlternateInfo() {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      {
        alternateFirstName,
        alternateMiddleName,
        alternateLastName,
        alternateAddressLine1,
        alternateAddressLine2,
        alternateAddressLine3,
        alternatePhone,
        alternateEmail,
        alternateDOB,
        alternateSex,
      },
      () => {
        console.log("Alternate info saved:", {
          alternateFirstName,
          alternateMiddleName,
          alternateLastName,
          alternateAddressLine1,
          alternateAddressLine2,
          alternateAddressLine3,
          alternatePhone,
          alternateEmail,
          alternateDOB,
          alternateSex,
        });
        resolve();
      }
    );
  });
}

// Allow function to print to console (albeit to its own console)
const log = (message) => {
  if (typeof console !== "undefined" && console.log) {
    console.log(message);
  }
};

function normalizeDefendantName(name) {
  // Remove any extra whitespace and split the name
  const nameParts = name.trim().split(/\s+/);

  let lastName, firstName, middleName;

  // Handle cases where the name might be in "Last, First Middle" format
  if (nameParts[0].endsWith(",")) {
    lastName = nameParts[0].slice(0, -1);
    firstName = nameParts[1] || "";
    middleName = nameParts.slice(2).join(" ");
  } else if (nameParts.length > 1) {
    // For names in "First Middle Last" format
    lastName = nameParts[nameParts.length - 1];
    firstName = nameParts[0];
    middleName = nameParts.slice(1, -1).join(" ");
  } else {
    // If it's just a single name, treat it as a last name
    lastName = name.trim();
    firstName = "";
    middleName = "";
  }

  // Use alternate names including blank strings for ALL names if ANY alternate name exists
  if (alternateFirstName || alternateMiddleName || alternateLastName) {
    firstName = alternateFirstName || "";
    middleName = alternateMiddleName || "";
    lastName = alternateLastName || "";
  }

  // Construct the normalized name
  let normalizedName = `${lastName}, ${firstName}`;
  if (middleName) {
    normalizedName += ` ${middleName}`;
  }

  return normalizedName.trim();
}

async function handleGenerateDocuments() {
  try {
    const docGenerator = new DocumentGenerator();
    await docGenerator.loadAlternateInfo();
    await docGenerator.generateAllDocuments(currentMode);
  } catch (error) {
    console.error("Error generating documents:", error);
    // Show error to user via UI
  }
}

function createClientObject(defendantName) {
  let clientNameLastFirstArray = defendantName.split(", ");
  let clientNameFirstLastArray = defendantName.split(" ");
  let client = {};

  if (clientNameLastFirstArray.length > 1) {
    client["Last Name"] = clientNameLastFirstArray[0];
    client["First Name"] = clientNameLastFirstArray[1].split(" ")[0];
    client["Middle Name"] =
      clientNameLastFirstArray[1].split(" ").length > 2
        ? clientNameLastFirstArray[1].split(" ")[1]
        : null;
  } else {
    client["First Name"] = clientNameFirstLastArray[0];
    client["Last Name"] =
      clientNameFirstLastArray[clientNameFirstLastArray.length - 1];
    client["Middle Name"] =
      clientNameFirstLastArray.length > 2 ? clientNameFirstLastArray[1] : null;
  }

  if (client["Middle Name"]?.length === 1) {
    client["Middle Name"] += ".";
  }

  // Use alternate names if they exist - never mind: see replacement strategy below
  // client["First Name"] = alternateFirstName || client["First Name"];
  // client["Middle Name"] = alternateMiddleName || client["Middle Name"];
  // client["Last Name"] = alternateLastName || client["Last Name"];

  // Use alternate names including blank strings for ALL names if ANY alternate name exists
  if (alternateFirstName || alternateMiddleName || alternateLastName) {
    client["First Name"] = alternateFirstName || "";
    client["Middle Name"] = alternateMiddleName || "";
    client["Last Name"] = alternateLastName || "";
  }

  // Create name to use for PDF expungement form (Last, First, Middle)
  client["PDF Name"] = `${client["Last Name"]}, ${client["First Name"]}${
    client["Middle Name"] ? ", " + client["Middle Name"] : ""
  }`;

  // Create name to use for expungement letter (First Middle Last)
  client["Letter Name"] = `${client["First Name"]} ${
    client["Middle Name"] ? client["Middle Name"] + " " : ""
  }${client["Last Name"]}`;

  return client;
}

async function displayClientInfo() {
  await loadAlternateInfo();
  //console.log("Loading alternate info");

  //console.log("displayClientInfo running");
  //console.log("Confirm button exists:", $("#confirm_name_override").length);
  //console.log("Cancel button exists:", $("#cancel_name_override").length);

  // Populate the input fields with current values
  $("#alternate_first_name_input").val(alternateFirstName);
  $("#alternate_middle_name_input").val(alternateMiddleName);
  $("#alternate_last_name_input").val(alternateLastName);
  $("#alternate_address_line1_input").val(alternateAddressLine1);
  $("#alternate_address_line2_input").val(alternateAddressLine2);
  $("#alternate_address_line3_input").val(alternateAddressLine3);
  $("#alternate_phone_input").val(alternatePhone);
  $("#alternate_email_input").val(alternateEmail);
  $("#alternate_date_of_birth_input").val(alternateDOB);
  $(`input[name="sex"][value="${alternateSex}"]`).prop("checked", true);

  $(document).on("click", "#confirm_name_override", async function () {
    console.log("Confirm button clicked");
    //console.log("Event target:", e.target);

    alternateFirstName = $("#alternate_first_name_input").val().trim();
    alternateMiddleName = $("#alternate_middle_name_input").val().trim();
    alternateLastName = $("#alternate_last_name_input").val().trim();
    alternateAddressLine1 = $("#alternate_address_line1_input").val().trim();
    alternateAddressLine2 = $("#alternate_address_line2_input").val().trim();
    alternateAddressLine3 = $("#alternate_address_line3_input").val().trim();
    alternatePhone = $("#alternate_phone_input").val().trim();
    alternateEmail = $("#alternate_email_input").val().trim();
    alternateDOB = $("#alternate_date_of_birth_input").val().trim();
    alternateSex = $('input[name="sex"]:checked').val() || "";
    await saveAlternateInfo();
    console.log("Name and address override confirmed:", {
      alternateFirstName,
      alternateMiddleName,
      alternateLastName,
      alternateAddressLine1,
      alternateAddressLine2,
      alternateAddressLine3,
    });
    $("#alternate_name_container").hide();
    await displayCases();
  });

  $(document).on("click", "#cancel_name_override", function () {
    console.log("Cancel button clicked");
    //console.log("Event target:", e.target);

    updateInputFields();
    $("#alternate_name_container").hide();
  });

  // Add input listeners for text fields
  addInputListener($("#alternate_first_name_input"), "alternateFirstName");
  addInputListener($("#alternate_middle_name_input"), "alternateMiddleName");
  addInputListener($("#alternate_last_name_input"), "alternateLastName");
  addInputListener(
    $("#alternate_address_line1_input"),
    "alternateAddressLine1"
  );
  addInputListener(
    $("#alternate_address_line2_input"),
    "alternateAddressLine2"
  );
  addInputListener(
    $("#alternate_address_line3_input"),
    "alternateAddressLine3"
  );
  addInputListener($("#alternate_phone_input"), "alternatePhone");
  addInputListener($("#alternate_email_input"), "alternateEmail");
  addInputListener($("#alternate_date_of_birth_input"), "alternateDOB");

  // Add input listener for radio buttons
  addSexRadioListener();
}

function addSexRadioListener() {
  $('input[name="sex"]').on("change", async function () {
    alternateSex = $(this).val();
    console.log("Sex updated:", alternateSex);
    await saveAlternateInfo();
  });
}

function createInputField(id, placeholder) {
  return $("<input>", {
    type: "text",
    id: id,
    placeholder: placeholder,
    css: {
      flex: "1 0 calc(33% - 5px)",
      marginRight: "5px",
      marginBottom: "5px",
      padding: "5px",
      boxSizing: "border-box",
      minWidth: "0", // Allows flex items to shrink below their minimum content size
    },
  });
}

// Input listener for alternate name and address input fields
function addInputListener(inputField, variableName) {
  inputField.on("input", async function () {
    const value = $(this).val().trim();
    switch (variableName) {
      case "alternateFirstName":
        alternateFirstName = value;
        break;
      case "alternateMiddleName":
        alternateMiddleName = value;
        break;
      case "alternateLastName":
        alternateLastName = value;
        break;
      case "alternateAddressLine1":
        alternateAddressLine1 = value;
        break;
      case "alternateAddressLine2":
        alternateAddressLine2 = value;
        break;
      case "alternateAddressLine3":
        alternateAddressLine3 = value;
        break;
      case "alternatePhone":
        alternatePhone = value;
        break;
      case "alternateEmail":
        alternateEmail = value;
        break;
      case "alternateDOB":
        alternateDOB = value;
        break;
    }
    console.log(`${variableName} updated:`, value);
    await saveAlternateInfo();
  });
}

// Function to delete a single case
async function deleteCase(caseNumber) {
  return new Promise((resolve) => {
    chrome.storage.local.get("cases", function(result) {
      let cases = result.cases || [];
      // Filter out the case with matching case number
      cases = cases.filter(c => c.CaseNumber !== caseNumber);
      
      // Save updated cases array back to storage
      chrome.storage.local.set({ cases }, function() {
        console.log(`Case ${caseNumber} deleted`);
        resolve();
      });
    });
  });
}

function updateInputFields() {
  $("#alternate_first_name_input").val(alternateFirstName);
  $("#alternate_middle_name_input").val(alternateMiddleName);
  $("#alternate_last_name_input").val(alternateLastName);
}

// displayCases with switch and delete button together: v5
// Modified displayCases function with reorganized layout
async function displayCases() {
  var allcases = await getCases();
  console.log("Displaying Cases");

  let html = "<table class='table table-striped align-middle'>";
  html += "<thead><tr><th scope='col' style='width: 45px'></th><th scope='col'>Case Number</th><th scope='col' id='defendant-header' style='cursor: pointer;'>Defendant</th><th scope='col'>Assessment</th></tr></thead>";
  html += "<tbody>";

  if (allcases.length != 0) {
    for (var x = allcases.length - 1; x >= 0; x--) {
      const isExpungeable = currentMode === "expungement" ? 
        isExpungeableEnoughForPaperwork(allcases[x]["Expungeable"]) :
        isWarrantStatusSufficientForPaperwork(allcases[x]?.warrantStatus);

      const overrideText = currentMode === "expungement" ? 
        "expungement paperwork" :
        "warrant paperwork";

      html += "<tr scope='row'>";
      
      // Actions column (delete button and override switch)
      let forceGenerateText = `Check to force ${overrideText} generation`
      if (currentMode === "warrant" && allcases[x]?.warrantStatus?.latestWarrantType === "penal summons") {
        forceGenerateText = "Penal summons paperwork unavailable: check to generate bench warrant paperwork instead"
      }


      html += `
        <td class="px-1 pe-0">
          <div class="d-flex flex-column align-items-center">
            <button class="btn p-0 text-danger delete-case-btn" 
                    style="font-size: 1.0rem; line-height: 1.0; text-decoration: none; position: relative; top: 0.4em;"
                    data-case-number="${allcases[x]["CaseNumber"]}"
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    title="Delete this case">
              ×
            </button>
            <div class="form-check form-switch mb-0 mt-2">
              <input type="checkbox" 
                     class="form-check-input override-checkbox" 
                     id="override-${allcases[x]["CaseNumber"]}"
                     data-case-number="${allcases[x]["CaseNumber"]}" 
                     ${currentMode === "expungement" ? 
                       (allcases[x]["Override"] ? "checked" : "") :
                       (allcases[x]["OverrideWarrant"] ? "checked" : "")
                     }
                     ${isExpungeable ? "disabled" : ""}
                     data-bs-toggle="tooltip"
                     data-bs-placement="top"
                     title="${isExpungeable ? 
                       `${overrideText} will be generated automatically` : 
                       `${forceGenerateText}`}">
            </div>
          </div>
        </td>`;

      // Case number cell with override label
      html += `
        <td class="ps-0">
          <div class="d-flex flex-column">
            <a href="#" class="case-link text-decoration-none" data-case-index="${x}">${allcases[x]["CaseNumber"].trim()}</a>
            <span class="text-muted" style="font-size: 0.75rem;">
              ${isExpungeable ? "Will generate" : "Override assessment"}
            </span>
          </div>
        </td>`;

      // Defendant name cell
      html += "<td><span>" + formatDefendantName(allcases[x]) + "</span></td>";

      // Assessment cell based on mode
      if (currentMode === "expungement") {
        html += generateExpungeabilityCell(allcases[x]);
      } else if (currentMode === "warrant") {
        html += generateWarrantStatusCell(allcases[x]);
      } else {
        html += `<td>Error: unknown tool mode ${currentMode}</td>`;
      }

      html += "</tr>";
    }
  } else {
    html += "<tr><td colspan='4'>No cases found</td></tr>";
  }

  html += "</tbody></table>";

  $("#tablediv").html(html);
  
  // Attach event listeners for existing functionality
  attachEventListeners(allcases);
  
  // Add event listeners for delete buttons
  $(".delete-case-btn").on("click", async function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const caseNumber = $(this).data("case-number");

    // Hide the tooltip before showing the confirmation dialog
    const tooltipInstance = bootstrap.Tooltip.getInstance(this);
    if (tooltipInstance) {
      tooltipInstance.hide();
    }
    
    // Show confirmation dialog
    if (confirm(`Are you sure you want to delete case ${caseNumber}?`)) {
      await deleteCase(caseNumber);
      await displayCases(); // Refresh the display
      await updateGenerateButtonState();
    }
  });

  // Add event listeners for override checkboxes with tooltip management
  $(".override-checkbox").on("click", function() {
    // Hide the tooltip associated with this checkbox
    const tooltipInstance = bootstrap.Tooltip.getInstance(this);
    if (tooltipInstance) {
      tooltipInstance.hide();
    }
  });
  
  initTooltips();
}

function formatDefendantName(caseData) {
  let defendantName = caseData["DefendantName"] || "";

  if (alternateLastName || alternateFirstName) {
    defendantName =
      (alternateLastName ? alternateLastName + ", " : "") +
      (alternateFirstName || "") +
      (alternateMiddleName ? " " + alternateMiddleName : "");
  }
  return defendantName;
}

function generateExpungeabilityCell(caseData) {
  let html = "<td><span class='";
  let tooltipText =
    caseData.overallExpungeability?.explanation || "No explanation available";

  switch (caseData["Expungeable"]) {
    case "All Expungeable":
      html += "text-expungeable";
      break;
    case "None Expungeable":
      html += "text-not-expungeable";
      break;
    case "Some Expungeable":
      html += "text-partially-expungeable";
      break;
    case "All Possibly Expungeable":
    case "Some Possibly Expungeable":
      html += "text-possibly-expungeable";
      break;
    default:
      if (
        caseData["Expungeable"].toLowerCase().includes("deferred") ||
        caseData["Expungeable"].toLowerCase().includes("statute")
      ) {
        html += "text-possibly-expungeable";
      } else {
        html += "text-possibly-expungeable";
      }
  }
  html += `' data-bs-toggle="tooltip" data-bs-placement="top" title="${tooltipText}">${caseData[
    "Expungeable"
  ].trim()}</span></td>`;
  return html;
}

function generateWarrantStatusCell(caseData) {
  const warrantStatus = caseData?.warrantStatus;
  let statusClass = "";
  let statusText = "No Warrant Information";
  let tooltipText = "Unable to determine warrant status";

  if (warrantStatus) {
    if (warrantStatus.hasOutstandingWarrant) {
      statusClass = "text-danger fw-bold";
      if (warrantStatus?.latestWarrantType.toLowerCase() === "penal summons") {
        statusText = "Outstanding Summons";
      } else {
        statusText = "Outstanding Warrant";
      }
    } else if (warrantStatus.warrantEntries?.length > 0) {
      statusClass = "text-success";
      statusText = "No Outstanding Warrant";
    }
    tooltipText = warrantStatus.explanation || tooltipText;
  }

  return `<td><span class='${statusClass}' data-bs-toggle="tooltip" data-bs-placement="top" 
                title="${tooltipText}">${statusText}</span></td>`;
}

function generateOverrideCell(caseData, mode) {
  if (mode === "expungement") {
    const isAlreadyExpungeable = isExpungeableEnoughForPaperwork(
      caseData["Expungeable"]
    );
    return `<td style="text-align: center; vertical-align: middle;">
          <input type="checkbox" class="override-checkbox" 
          data-case-number="${caseData["CaseNumber"]}" 
          ${caseData["Override"] ? "checked" : ""} 
          ${isAlreadyExpungeable ? "disabled" : ""}
          title="${
            isAlreadyExpungeable
              ? "Paperwork will be generated: no need to override"
              : "Paperwork will not be generated: check to override"
          }">
          </td>`;
  } else if (mode === "warrant") {
    const isAlreadySufficient = isWarrantStatusSufficientForPaperwork(
      caseData?.warrantStatus
    );
    // const isAlreadySufficient = isWarrantStatusSufficientForPaperwork({
    //   warrantStatus: caseData?.warrantStatus,
    //   caseType: caseData?.caseType
    // })

    return `<td style="text-align: center; vertical-align: middle;">
          <input type="checkbox" class="override-checkbox" 
          data-case-number="${caseData["CaseNumber"]}" 
          ${caseData["OverrideWarrant"] ? "checked" : ""} 
          ${isAlreadySufficient ? "disabled" : ""}
          title="${
            isAlreadySufficient
              ? "Warrant paperwork will be generated: no need to override"
              : "Warrant paperwork will not be generated: check to override"
          }">
          </td>`;
  }
  return "<td></td>"; // Empty override column
}

function attachEventListeners(allcases) {
  // Case link clicks
  $(".case-link").on("click", function (e) {
    e.preventDefault();
    const caseIndex = $(this).data("case-index");
    displayCaseDetails(allcases[caseIndex]);
  });

  // Override checkbox changes
  $(".override-checkbox").on("change", function () {
    const caseNumber = $(this).data("case-number");
    const isOverridden = $(this).is(":checked");
    updateOverrideStatus(caseNumber, isOverridden);
  });

  // Defendant header clicks
  $("#defendant-header")
    .off("click")
    .on("click", function () {
      $("#alternate_name_container").toggle();
    });
}

// Function to update override status in Chrome storage
function updateOverrideStatus(caseNumber, isOverridden) {
  chrome.storage.local.get("cases", function (result) {
    let cases = result.cases || [];
    const caseIndex = cases.findIndex((c) => c.CaseNumber === caseNumber);

    if (caseIndex !== -1) {
      if (currentMode === "expungement") {
        cases[caseIndex].Override = isOverridden;
        chrome.storage.local.set({ cases: cases }, function () {
          console.log(
            `Expungement override status updated for case ${caseNumber}: ${isOverridden}`
          );
          // Refresh the cases display to reflect the updated override status
          displayCases();
        });
      } else if (currentMode === "warrant") {
        cases[caseIndex].OverrideWarrant = isOverridden;
        chrome.storage.local.set({ cases: cases }, function () {
          console.log(
            `Warrant override status updated for case ${caseNumber}: ${isOverridden}`
          );
          // Refresh the cases display to reflect the updated override status
          displayCases();
        });
      }
    } else {
      console.error(`Case ${caseNumber} not found in storage`);
    }
  });
}

// Storage listener updates validation state
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  // Check if any relevant data has changed
  if (changes.cases || changes.attorneyInfo || changes.toolMode || changes.warrantDetails) {
      await updateGenerateButtonState();
  }
});

// When the popup opens
document.addEventListener("DOMContentLoaded", async function () {
  console.log("DOM loaded");

  const radioButtons = document.querySelectorAll('input[name="tool-mode"]');
  //console.log("Found radio buttons:", radioButtons);

  radioButtons.forEach((radio) => {
    // console.log("Adding listener to:", radio.id);
    radio.addEventListener("change", async function () {
      console.log("Mode switch clicked:", this.value);
      if (this.checked) {
        await saveMode(this.value);
        console.log("Current mode after save:", currentMode);

        // Check if we're in case details view
        const isInCaseDetails = $("#charges-container").length > 0;
        if (isInCaseDetails) {
          // Find the case data and refresh the details view
          const cases = await getCases();
          const caseNumber = $("#case-number").text();
          const caseData = cases.find((c) => c.CaseNumber === caseNumber);
          if (caseData) {
            displayCaseDetails(caseData);
          }
        } else {
          // If in main view, refresh the case table
          await displayCases();
        }
      }
    });
  });
  // Initialize all required functionality
  try {
    await Promise.all([
      loadMode(),
      loadAttorneyInfo(),
      displayClientInfo(),
      displayCases(),
    ]);

    // Add attorney info event listeners after everything is loaded
    addAttorneyInputListeners();
    attachAttorneyInfoHandlers();
  } catch (error) {
    console.error("Error during initialization:", error);
  }
  
  // Add validation check before generating documents
  const generateButton = $('#generate_documents_button');
  generateButton.on('click', async function(e) {
      e.preventDefault();
      const [isValid, message] = await validateGenerateButton();
      
      if (isValid) {
          handleGenerateDocuments();
      } else {
          // Force show the alert even if it's already displayed
          const alertContainer = $('#validation-alert-container');
          alertContainer.empty();
          
          const alert = $(`
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
              <strong>Cannot Generate Documents:</strong> ${message}
              <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
          `);
          
          alertContainer.append(alert);
          alert[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          alert.css('animation', 'pulse 2s');
      }
  });
  // const generateButton = $('#generate_documents_button');
  // generateButton.on('click', async function(e) {
  //     e.preventDefault();
  //     const [isValid, message] = await validateGenerateButton();
      
  //     if (isValid) {
  //         handleGenerateDocuments();
  //     }
  // });

  // Storage listener updates validation state
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  // Check if any relevant data has changed
  if (changes.cases || changes.attorneyInfo || changes.toolMode || changes.warrantDetails) {
      await updateGenerateButtonState();
    }
  });

  //   // Storage listener updates validation state
  //   chrome.storage.onChanged.addListener(async (changes, namespace) => {
  //     if (changes.warrantDetails || 
  //         changes.attorneyInfo || 
  //         changes.toolMode) {
  //         await updateGenerateButtonState();
  //     }
  // });

  await updateGenerateButtonState();
});

//Starts the Content Script to add a Case
jQuery("#evaluate_case_button").click(function () {
  console.log("evaluate_case_button Case Button Clicked");
  chrome.runtime.sendMessage({ action: "check_expungeability" });
});

//Starts the Content Script to open cases from the search page
jQuery("#overview_button").click(function () {
  console.log("overview_button Case Button Clicked");
  // Send message to active tab
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "overview_page" });
      }
  });
});

//Empties Cases and Client from local Storage
jQuery("#emptycases").click(function () {
  console.log("Deleting Client and Cases");
  chrome.storage.local.clear(async function () {
    var error = chrome.runtime.lastError;
    if (error) {
      console.error(error);
    }
    
    // Reset all in-memory state
    resetInMemoryState();
    
    // Update UI
    chrome.runtime.sendMessage({ action: "overview_page" });
    updateAttorneyDisplay();
    await displayClientInfo();
    await displayCases();
    await updateGenerateButtonState();
    
    // Force refresh any open forms
    if ($("#warrant_recall_details_section").is(":visible")) {
      showWarrantDetailsForm();
    }
    if ($("#attorney_info_container").is(":visible")) {
      updateFormFields();
    }
  });
});

// Generate generateWarrantHistoryTable for use with displayCaseDetails function with visual indication of clickable dates
function generateWarrantHistoryTable(warrantEntries, caseData) {
  if (!warrantEntries || warrantEntries.length === 0) return "";

  const isClickable =
    currentMode === "warrant" &&
    isWarrantStatusSufficientForPaperwork(
      caseData?.warrantStatus,
      caseData?.OverrideWarrant,
      caseData?.caseType
    );

  return `
    <div class="warrant-history mt-3">
      <h5>Warrant History</h5>
      <table class="table table-sm table-bordered">
        <thead>
          <tr>
            <th>Date</th>
            <th>Action</th>
            <th>Type</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${warrantEntries
            .map(
              (entry) => `
            <tr>
              <td>
                <a href="#" 
                   class="warrant-date-link" 
                   data-date="${
                     new Date(entry.date).toISOString().split("T")[0]
                   }"
                   style="${
                     isClickable
                       ? "text-decoration: underline; color: blue; cursor: pointer;"
                       : "text-decoration: none; color: inherit; cursor: default;"
                   }">
                  ${new Date(entry.date).toLocaleDateString()}
                </a>
              </td>
              <td>${entry.warrantAction || "N/A"}</td>
              <td>${entry.warrantType || "N/A"}</td>
              <td>
                ${entry.docketText}
                ${
                  entry.warrantDetails?.bailAmount
                    ? `<br>Bail: $${entry.warrantDetails.bailAmount}`
                    : ""
                }
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

// Display case details
async function displayCaseDetails(caseData) {
  // Fetch the HTML template
  const response = await fetch(chrome.runtime.getURL("case-details.html"));
  const templateHtml = await response.text();

  // Insert the template into the DOM
  $("#tablediv").html(templateHtml);

  // Populate the template with data
  $("#case-number").text(caseData.CaseNumber);
  $("#case-type").text(caseData.caseType);
  $("#court-location").text(caseData.CourtLocation);
  $("#filing-date").text(caseData.FilingDate);
  $("#defendant-name").text(caseData.DefendantName);

  // Define friendly names for properties
  const friendlyNames = {
    count: "Count",
    statute: "Statute",
    charge: "Charge Description",
    severity: "Severity",
    offenseDate: "Date of Offense",
    citationArrestNumbers: "Citation/Arrest Numbers",
    plea: "Plea",
    disposition: "Disposition",
    dispositions: "Disposition(s)",
    dispositionDate: "Disposition Date",
    dispositionDates: "Disposition Date(s)",
    sentencing: "Sentencing",
    offenseNotes: "Offense Notes",
    specialCourtsEligibility: "Special Courts Eligibility",
    dispositionCode: "Disposition Code",
    sentenceCode: "Sentence Code",
    sentenceDescription: "Sentence Description",
    sentenceLength: "Sentence Length",
    withPrejudice: "Dismissed with Prejudice",
    deferredAcceptance: "Deferred Acceptance",
    statuteOfLimitationsPeriod: "Limitations Period",
    statuteOfLimitationsExpiryDate: "Limitations Period Expires",
    statuteOfLimitationsExpiryEarliestDate: "Earliest Limitations Expiry",
    statuteOfLimitationsExpiryLatestDate: "Latest Limitations Expiry",
    statuteOfLimitationsStatus: "Limitations Status",
    deferralPeriodExpiryDate: "Deferral Period Expires",
    deferralPeriodExpiryEarliestDate: "Earliest Deferral Expiry",
    deferralPeriodExpiryLatestDate: "Latest Deferral Expiry",
    dismissedOnOralMotion: "Dismissed on Oral Motion",
    hasOutstandingWarrant: "Outstanding Warrant",
    warrantDetails: "Warrant Status",
    otnNumbers: "OTN Numbers",
  };

  // Define properties to suppress
  const suppressedProperties = [
    "isExpungeable",
    "dispositionCode",
    "sentenceCode",
    "rowspan",
    "count",
    "statuteOfLimitationsCertainty",
    "finalJudgment",
    "dismissedOnOralMotion",
    "dismissalDate",
    "processingComplete"
  ];

  // Helper function to check if a value is blank
  const isBlank = (value) => {
    return value === null || value === undefined || String(value).trim() === "";
  };

  // Helper function to format property values
  const formatValue = (key, value) => {
    if (key === "withPrejudice" && value === false) {
      return "Not found in docket: check disposition";
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    return value;
  };

  // Deal with 

  // Helper function to merge/modify charge properties for display
  const processChargePropertiesForDisplay = (charges) => {
    // Join dispositions and disposition dates and remove dispositionDates from the charge object
    let processedCharges = [];
    for (const charge of charges) {
      let processedCharge = { ...charge };
      for (let i = 0; i < charge.dispositions.length; i++) {
        if (i >= charge.dispositionDates.length) {
          break;
        }

        processedCharge.dispositions[
          i
        ] = `${charge.dispositions[i]} (${charge.dispositionDates[i]})`;
      }
      processedCharge.dispositions = processedCharge.dispositions.join("<br>");
      if (charge.dispositions.length > 1) {
        processedCharge.dispositions = `<br>${processedCharge.dispositions}`;
      }
      processedCharges.push(processedCharge);
      delete processedCharge.dispositionDates;
    }
    return processedCharges;
  };

  // Helper function to generate HTML for a set of properties
  const generatePropertiesHtml = (properties) => {
    return Object.entries(properties)
      .filter(
        ([key, value]) => !suppressedProperties.includes(key) && !isBlank(value)
      )
      .map(
        ([key, value]) => `
        <p><strong>${friendlyNames[key] || key}:</strong> ${formatValue(
          key,
          value
        )}</p>
      `
      )
      .join("");
  };

  /////////////////////// Populate charges ///////////////////////
  const chargesContainer = $("#charges-container");
  let chargesProcessedForDisplay = processChargePropertiesForDisplay(
    caseData.charges
  );

  chargesProcessedForDisplay.forEach((charge, index) => {
    const chargeHtml = `
        <div class="card mb-3">
            <div class="card-header">
                <h5 class="mb-0">Charge ${index + 1}</h5>
                ${
                  currentMode === "expungement"
                    ? `
                    <span class="badge ${getExpungeabilityClass(
                      charge.isExpungeable.status
                    )}">
                        ${charge.isExpungeable.status}
                    </span>
                `
                    : ""
                }
            </div>
            <div class="card-body">
                ${
                  currentMode === "expungement"
                    ? `<div class="expungeability-explanation">${charge.isExpungeable.explanation}</div>`
                    : ""
                }
                ${generatePropertiesHtml(charge)}
            </div>
        </div>
    `;
    chargesContainer.append(chargeHtml);
  });

  /////////////////////// Populate additional factors if they exist ///////////////////////
  if (
    caseData.additionalFactors &&
    Object.keys(caseData.additionalFactors).length > 0
  ) {
    // Create a copy of additionalFactors and process warrant status
    let additionalFactorsProcessed = { ...caseData.additionalFactors };
    let warrantTableHtml = "";

    // Process warrant status if it exists
    if (additionalFactorsProcessed?.warrantDetails) {
      if (additionalFactorsProcessed.warrantDetails.warrantEntries) {
        warrantTableHtml = generateWarrantHistoryTable(
          additionalFactorsProcessed.warrantDetails.warrantEntries,
          caseData
        );
      }
      additionalFactorsProcessed.warrantDetails =
        additionalFactorsProcessed.warrantDetails.explanation;
    }

    // Build complete HTML content
    let additionalFactorsHtml = '<h4 class="mb-3">Additional Factors:</h4>';

    // Add factors card if there are factors to display
    const factorsHtml = generatePropertiesHtml(additionalFactorsProcessed);
    if (factorsHtml) {
      additionalFactorsHtml += `
            <div class="card mb-3">
                <div class="card-body">
                    ${factorsHtml}
                </div>
            </div>
        `;
    }

    /////////////////////// Add warrant history table if it exists ///////////////////////
    // Recommend testing with 1CPC-22-0001376
    if (warrantTableHtml) {
      additionalFactorsHtml += warrantTableHtml;
    }

    // Set complete HTML content at once
    $("#additional-factors-container").html(additionalFactorsHtml);
  }

  // Set overall expungeability
  /////////////////////// Set overall status ///////////////////////
  const overallStatusContainer = $("#overall-expungeability");
  if (currentMode === "expungement") {
    overallStatusContainer.text(caseData.Expungeable);
    overallStatusContainer.addClass(
      getExpungeabilityClass(caseData.Expungeable)
    );
  } else {
    // Create badge styling to match expungeability badge style
    const warrantStatus = caseData?.warrantStatus;
    let statusText = "No Warrant Information";
    let badgeClass = "badge "; // Base badge class

    if (warrantStatus) {
      if (warrantStatus.hasOutstandingWarrant) {
        if (warrantStatus?.latestWarrantType.toLowerCase() === "penal summons") {
          statusText = "Outstanding Summons";
        } else {
          statusText = "Outstanding Warrant";
        }
        badgeClass += "bg-danger text-white";
      } else if (warrantStatus.warrantEntries?.length > 0) {
        statusText = "No Outstanding Warrant";
        badgeClass += "bg-success text-white";
      } else {
        badgeClass += "bg-warning text-dark";
      }
    }

    // Replace the content with a badge span
    overallStatusContainer.html(`
          <span class="${badgeClass}" data-bs-toggle="tooltip" 
                data-bs-placement="top" title="${
                  warrantStatus?.explanation ||
                  "Unable to determine warrant status"
                }">
              ${statusText}
          </span>
      `);
  }

  /// Initialize warrant UI if in warrant mode - but only AFTER all other DOM manipulation
  if (currentMode === "warrant") {
    // Delay initialization slightly to ensure DOM is ready
    setTimeout(() => initializeWarrantUI(caseData), 0);
  }

  // Add click event listener to back button
  $("#back-button").on("click", function () {
    displayCases();
  });
}
////////////////////////////// WARRANT DETAILS /////////////////////////////
// State object for warrant details
let warrantDetails = {
  consultationDate: "",
  consultationTown: "",
  consultVerbPhrase: "",
  nonAppearanceDate: "",
  warrantIssueDate: "",
  warrantAmount: "",
  caseNumber: "", // Store which case these details belong to
};

async function loadWarrantDetails(caseNumber) {
  console.log("loadWarrantDetails called with:", caseNumber);
  
  if (!caseNumber) {
      console.warn("No case number provided to loadWarrantDetails");
      return;
  }

  return new Promise((resolve) => {
      chrome.storage.local.get("warrantDetails", function(result) {
          // If we have stored values for this case, use those
          if (result.warrantDetails && result.warrantDetails[caseNumber]) {
              warrantDetails = {
                  ...result.warrantDetails[caseNumber],
                  caseNumber
              };
              console.log("Using stored warrant details:", warrantDetails);
          } else {
              // Otherwise preserve existing values, just ensure caseNumber is set
              warrantDetails = {
                  ...warrantDetails,  // Keep existing values
                  caseNumber          // Just update the case number
              };
              console.log("No stored details, preserving existing values:", warrantDetails);
          }
          resolve(warrantDetails);
      });
  });
}

// Save warrant details to storage
async function saveWarrantDetails() {
  console.log("Saving warrant details with consultationDate:", warrantDetails.consultationDate);
  return new Promise((resolve) => {
    chrome.storage.local.get("warrantDetails", function (result) {
      const allWarrantDetails = result.warrantDetails || {};
      console.log("Existing warrant details in storage:", allWarrantDetails);
      allWarrantDetails[warrantDetails.caseNumber] = warrantDetails;

      chrome.storage.local.set({ warrantDetails: allWarrantDetails }, () => {
        console.log("Warrant details saved:", warrantDetails);
        resolve();
      });
    });
  });
}

// Update form with current values
function updateWarrantDetailsForm() {
  $("#consultation_date_input").val(warrantDetails.consultationDate);
  $("#consultation_town_input").val(warrantDetails.consultationTown);
  $("#consult_verb_phrase_input").val(warrantDetails.consultVerbPhrase);
  $("#non_appearance_date_input").val(warrantDetails.nonAppearanceDate);
  $("#warrant_issue_date_input").val(warrantDetails.warrantIssueDate);
  $("#warrant_amount_input").val(warrantDetails.warrantAmount);
}


// Add warrant details handlers
function  attachWarrantDetailsHandlers() {
  // Show form when clicking the button
  $("#warrant_recall_details_button")
    .off("click")
    .on("click", async function () {
      // Ensure we have the latest warrant details before showing the form
      await loadWarrantDetails(warrantDetails.caseNumber);
      showWarrantDetailsForm();
      $("#warrant_recall_details_section").show();
      $("#warrant_recall_details_section")
        .get(0)
        .scrollIntoView({ behavior: "smooth" });
    });

    $("#save_warrant_recall_details").off('click').on("click", async function () {
      if (!validateWarrantDetails()) {
          return; // Don't proceed if validation fails
      }

      warrantDetails = {
          ...warrantDetails,
          consultationDate: $("#consultation_date_input").val(),
          consultationTown: $("#consultation_town_input").val(),
          consultVerbPhrase: $("#consult_verb_phrase_input").val(),
          nonAppearanceDate: $("#non_appearance_date_input").val(),
          warrantIssueDate: $("#warrant_issue_date_input").val(),
          warrantAmount: $("#warrant_amount_input").val(),
      };

      await saveWarrantDetails();
      $("#warrant_recall_details_section").hide();
      // Scroll to Evaluate Case button (makes Back button visible and more prominent)
      $("#evaluate_case_button").get(0).scrollIntoView({ behavior: "smooth" });
      
  });

  // Add input event handlers to remove invalid state when user starts typing
  ['consultation_date_input', 'consult_verb_phrase_input', 
    'non_appearance_date_input', 'warrant_issue_date_input', 
    'warrant_amount_input'].forEach(fieldId => {
       $(`#${fieldId}`).on('input', function() {
           $(this).removeClass('is-invalid');
           $(this).next('.invalid-feedback').remove();
       });
   });

   // Add special handler for warrant amount to validate on input
   $("#warrant_amount_input").on('input', function() {
    $(this).removeClass('is-invalid');
    $(this).next('.invalid-feedback').remove();
    
    const value = $(this).val().trim();
    if (value) {
        const numericAmount = parseFloat(value.replace(/[^\d.-]/g, ''));
        if (isNaN(numericAmount)) {
            $(this).addClass('is-invalid');
            $(this).after('<div class="invalid-feedback">Please enter a valid number</div>');
        } else if (numericAmount < 0) {
            $(this).addClass('is-invalid');
            $(this).after('<div class="invalid-feedback">Amount cannot be negative</div>');
        }
    }
});

   // Add date input handlers to revalidate dates when any date changes
   ['consultation_date_input', 'non_appearance_date_input', 
    'warrant_issue_date_input'].forEach(dateFieldId => {
       $(`#${dateFieldId}`).on('change', function() {
           // Only revalidate if all date fields have values
           const allDatesHaveValues = ['consultation_date_input', 
               'non_appearance_date_input', 
               'warrant_issue_date_input'].every(id => 
                   $(`#${id}`).val().trim() !== ''
               );
           
           if (allDatesHaveValues) {
               validateWarrantDetails();
           } else {
               // Clear validation states from all date fields
               ['consultation_date_input', 'non_appearance_date_input', 
                'warrant_issue_date_input'].forEach(id => {
                   $(`#${id}`).removeClass('is-invalid').next('.invalid-feedback').remove();
               });
           }
       });
   });

  // Cancel button handler
  $("#cancel_warrant_recall_details").on("click", function () {
    $("#warrant_recall_details_section").hide();
    showWarrantDetailsForm(); // Reset to last saved state
    $("#evaluate_case_button").get(0).scrollIntoView({ behavior: "smooth" }); // Scroll to Evaluate Case button (makes Back button visible and more prominent)
  });

  // Add input listeners for immediate state updates
  $("#consultation_date_input").on("change", function () {
    warrantDetails.consultationDate = $(this).val();
  });
  $("#consultation_town_input").on("input", function () {
    warrantDetails.consultationTown = $(this).val().trim();
  });
  $("#consult_verb_phrase_input").on("input", function () {
    warrantDetails.consultVerbPhrase = $(this).val().trim();
  });
  $("#non_appearance_date_input").on("change", function () {
    warrantDetails.nonAppearanceDate = $(this).val();
  });
  $("#warrant_issue_date_input").on("change", function () {
    warrantDetails.warrantIssueDate = $(this).val();
  });
  $("#warrant_amount_input").on("input", function () {
    warrantDetails.warrantAmount = $(this).val().trim();
  });

  // Handler for warrant date links
  $(document).on("click", ".warrant-date-link", async function (e) {
    e.preventDefault();

    // Get current case data
    const cases = await getCases();
    const caseNumber = $("#case-number").text();
    const caseData = cases.find((c) => c.CaseNumber === caseNumber);

    if (
      currentMode === "warrant" &&
      isWarrantStatusSufficientForPaperwork(
        caseData?.warrantStatus,
        caseData?.OverrideWarrant,
        caseData?.caseType
      )
    ) {
      const date = $(this).data("date");

      // Show the warrant details section if hidden
      $("#warrant_recall_details_section").show();

      // Set the warrant issue date
      $("#warrant_issue_date_input").val(date);
      warrantDetails.warrantIssueDate = date;

      // Scroll to the input field
      $("#warrant_issue_date_input")[0].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  });
}

// Show warrant details form with current values
function showWarrantDetailsForm() {
  console.log("Showing warrant details form with warrantDetails:", warrantDetails);
  // Let the browser create today's date in the local timezone (which we know is HST)
  const today = new Date();
  // Format it directly to YYYY-MM-DD
  const todayFormatted = today.getFullYear() + '-' + 
                        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(today.getDate()).padStart(2, '0');
                        // Today's date assumed to be in HST timezone

  // Set default values if they're not already set
  if (!warrantDetails.consultationDate) {
    warrantDetails.consultationDate = todayFormatted;
    document.getElementById('consultation_date_input').value = todayFormatted;
  }

  if (!warrantDetails?.nonAppearanceDate) {
      if (warrantDetails?.warrantIssueDate) {
        console.log("No non-appearance date found but warrant issue date exists.")
        console.log("Setting non-appearance date to warrant issue date...");
        warrantDetails.nonAppearanceDate = warrantDetails.warrantIssueDate;
      }
    }

  // Log each form field and its intended value before setting
  console.log("Setting consultation_date_input to:", warrantDetails.consultationDate || today);
  console.log("Setting warrant_issue_date_input to:", warrantDetails.warrantIssueDate);
  console.log("Setting warrant_amount_input to:", warrantDetails.warrantAmount);
  console.log("Setting non_appearance_date_input to:", warrantDetails.nonAppearanceDate);

  // Get references to form elements and verify they exist
  const consultationDateInput = $("#consultation_date_input");
  const warrantIssueDateInput = $("#warrant_issue_date_input");
  const warrantAmountInput = $("#warrant_amount_input");
  const nonAppearanceDateInput = $("#non_appearance_date_input");

  console.log("Form elements found:", {
      consultationDateInput: consultationDateInput.length > 0,
      warrantIssueDateInput: warrantIssueDateInput.length > 0,
      warrantAmountInput: warrantAmountInput.length > 0,
      nonAppearanceDateInput: nonAppearanceDateInput.length > 0
  });

  // Update fields with current warrantDetails values or set to empty string
  if (consultationDateInput.length) {
      consultationDateInput.val(warrantDetails.consultationDate || today);
  }
  if (warrantIssueDateInput.length) {
      console.log("Setting warrant issue date...");
      warrantIssueDateInput.val(warrantDetails.warrantIssueDate || ""); // Default is issue date determined by DocketService in unified_cases
      console.log("Warrant issue date after setting:", warrantIssueDateInput.val());
  }
  if (warrantAmountInput.length) {
      console.log("Setting warrant amount...");
      warrantAmountInput.val(warrantDetails.warrantAmount || "");
      console.log("Warrant amount after setting:", warrantAmountInput.val());
  }
  if (nonAppearanceDateInput.length) {
      console.log("Setting non-appearance date...");
      nonAppearanceDateInput.val(warrantDetails.nonAppearanceDate || "");
      console.log("Non-appearance date after setting:", nonAppearanceDateInput.val());
  }
  
  // Also try setting values directly through vanilla JavaScript
  const warrantIssueDateElement = document.getElementById('warrant_issue_date_input');
  const warrantAmountElement = document.getElementById('warrant_amount_input');
  const nonAppearanceDateElement = document.getElementById('non_appearance_date_input');
  
  if (warrantIssueDateElement) {
      warrantIssueDateElement.value = warrantDetails.warrantIssueDate || "";
      console.log("Warrant issue date after direct set:", warrantIssueDateElement.value);
  }
  
  if (warrantAmountElement) {
      warrantAmountElement.value = warrantDetails.warrantAmount || "";
      console.log("Warrant amount after direct set:", warrantAmountElement.value);
  }
  
  if (nonAppearanceDateElement) {
      nonAppearanceDateElement.value = warrantDetails.nonAppearanceDate || "";
      console.log("Non-appearance date after direct set:", nonAppearanceDateElement.value);
  }
  
    // Update the rest of the fields
  $("#consultation_town_input").val(warrantDetails.consultationTown || "");
  $("#consult_verb_phrase_input").val(warrantDetails.consultVerbPhrase || "");
  $("#non_appearance_date_input").val(warrantDetails.nonAppearanceDate || "");

  // Log final state
  console.log("Form values after setting:", {
      consultationDate: $("#consultation_date_input").val(),
      warrantIssueDate: $("#warrant_issue_date_input").val(),
      warrantAmount: $("#warrant_amount_input").val(),
      nonAppearranceDate: $("#non_appearance_date_input").val()
  });
}

// Handle warrant details section creation
async function initializeWarrantUI(caseData) {
  console.log("Initializing warrant UI");
  console.log("Case data:", caseData);

  // Only proceed if we're in warrant mode and have a sufficient warrant status
  if (currentMode === 'warrant' && 
      isWarrantStatusSufficientForPaperwork(caseData.warrantStatus, caseData.OverrideWarrant)) {
      
      // First load the default settings
      const defaultDataUrl = chrome.runtime.getURL('settings.json');
      const defaultResponse = await fetch(defaultDataUrl);
      const defaultData = await defaultResponse.json();

      // Then load any existing stored values
      await loadWarrantDetails(caseData.CaseNumber);

      // Set warrant issue date from case docket warrant details if not otherwise set
      if (!warrantDetails.warrantIssueDate && caseData.warrantStatus?.latestWarrantDate) {
          try {
              const [month, day, year] = caseData.warrantStatus.latestWarrantDate.split('/');
              warrantDetails.warrantIssueDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } catch (error) {
              console.error("Error formatting warrant date:", error);
          }
      }

      // Set warrant amount from case docket warrant details if not otherwise set,
      // falling back to default amount from settings if no amount found
      if (!warrantDetails.warrantAmount) {
        if (caseData.warrantStatus?.latestBailAmount) {
            const numericBail = caseData.warrantStatus.latestBailAmount.replace(/,/g, '');
            if (!isNaN(numericBail)) {
                warrantDetails.warrantAmount = numericBail;
            }
        } else {
            // Use default amount from settings if no amount found in docket
            warrantDetails.warrantAmount = defaultData.default_warrant_amount;
        }
      }

      // // Set warrant amount from case docket warrant details if not otherwise set
      // if (!warrantDetails.warrantAmount && caseData.warrantStatus?.latestBailAmount) {
      //     const numericBail = caseData.warrantStatus.latestBailAmount.replace(/,/g, '');
      //     if (!isNaN(numericBail)) {
      //         warrantDetails.warrantAmount = numericBail;
      //     }
      // }

      // Set non-appearance date from case docket warrant details if not otherwise set
      if (!warrantDetails.nonAppearanceDate && caseData.warrantStatus?.latestNonAppearanceDate) {
          try {
              const [month, day, year] = caseData.warrantStatus.latestNonAppearanceDate.split('/');
              warrantDetails.nonAppearanceDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } catch (error) {
              console.error(`Error formatting non-appearance date ${caseData.warrantStatus.latestNonAppearanceDate}:`, error);
          }
      }

      console.log("Final warrantDetails after setting defaults:", warrantDetails);
      
      // Initialize the warrant details functionality
      attachWarrantDetailsHandlers();
      const warrantButton = $("#warrant_recall_details_button");
      warrantButton.show();
  } else {
      $("#warrant_recall_details_button").hide();
  }
}

/////////////////////////// ATTORNEY INFORMATION ///////////////////////////
// Attorney information state
let attorneyInfo = {
  isPublicDefender: true,
  firmName: "",
  attorneyName: "",
  attorneyRegistration: "",
  attorneySignatureLocation: "",
  headPdName: "",
  headPdRegistration: "",
  attorneyAddress1: "",
  attorneyAddress2: "",
  attorneyAddress3: "",
  attorneyAddress4: "",
  attorneyTelephone: "",
  attorneyFax: "",
  attorneyEmail: "",
  circuitOrdinal: "",
};

// Load attorney info from storage
async function loadAttorneyInfo() {
  // First load the default data
  const defaultDataUrl = chrome.runtime.getURL('settings.json');
  const defaultResponse = await fetch(defaultDataUrl);
  const defaultData = await defaultResponse.json();
  
  return new Promise((resolve) => {
    chrome.storage.local.get("attorneyInfo", function (result) {
      if (result.attorneyInfo) {
        attorneyInfo = {
          ...attorneyInfo,
          ...result.attorneyInfo,
          // Restore defaults if values are empty
          headPdName: result.attorneyInfo.headPdName || defaultData.head_public_defender_name,
          headPdRegistration: result.attorneyInfo.headPdRegistration || defaultData.head_public_defender_registration,
        };
        updateAttorneyDisplay();
        updateFormFields();
      } else {
        // Initialize with defaults if no stored data
        attorneyInfo.headPdName = defaultData.head_public_defender_name;
        attorneyInfo.headPdRegistration = defaultData.head_public_defender_registration;
        updateFormFields();
      }
      resolve(attorneyInfo);
    });
  });
}

// Save attorney info to storage
async function saveAttorneyInfo() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ attorneyInfo }, () => {
      console.log("Attorney info saved:", attorneyInfo);
      updateAttorneyDisplay();
      resolve();
    });
  });
}

// Update the attorney name display in the header
function updateAttorneyDisplay() {
  const displayElement = $("#attorney_info_display");
  const defaultText = "Set Attorney Information";

  if (attorneyInfo.attorneyName) {
    // When attorney name is set, explicitly add text-decoration-none
    displayElement.html(`
      <span class="attorney-name">${attorneyInfo.isPublicDefender ? "Public Defender: " : "Attorney: "}${attorneyInfo.attorneyName}</span>
      <a href="#" class="change-link text-white-50 ms-2">
        <small>[Change]</small>
      </a>
    `);
    displayElement.addClass('text-decoration-none');
  } else {
    // When no attorney name is set, ensure text-decoration-none is removed
    displayElement.html(`
      <a href="#" class="text-white">${defaultText}</a>
    `);
    displayElement.removeClass('text-decoration-none');
  }
}

// Update form fields with current values
function updateFormFields() {
  $("#firm_name_input").val(attorneyInfo.firmName);
  $("#attorney_name_input").val(attorneyInfo.attorneyName);
  $("#attorney_registration_input").val(attorneyInfo.attorneyRegistration);
  $("#attorney_signature_location_input").val(attorneyInfo.attorneySignatureLocation);
  $("#head_pd_name_input").val(attorneyInfo.headPdName);
  $("#head_pd_registration_input").val(attorneyInfo.headPdRegistration);
  $("#attorney_address_1_input").val(attorneyInfo.attorneyAddress1);
  $("#attorney_address_2_input").val(attorneyInfo.attorneyAddress2);
  $("#attorney_address_3_input").val(attorneyInfo.attorneyAddress3);
  $("#attorney_address_4_input").val(attorneyInfo.attorneyAddress4);
  $("#attorney_telephone_input").val(attorneyInfo.attorneyTelephone);
  $("#attorney_fax_input").val(attorneyInfo.attorneyFax);
  $("#attorney_email_input").val(attorneyInfo.attorneyEmail);
  //$("#circuit_ordinal_input").val(attorneyInfo.circuitOrdinal); // Not currently used
  $("#attorney_type_toggle").prop("checked", attorneyInfo.isPublicDefender);

  // Update field visibility based on attorney type
  updateFieldVisibility();
}

// Add input listeners for attorney form fields
function addAttorneyInputListeners() {
  const fields = {
      firm_name_input: "firmName",
      attorney_name_input: "attorneyName",
      attorney_registration_input: "attorneyRegistration",
      attorney_signature_location_input: "attorneySignatureLocation",
      head_pd_name_input: "headPdName",
      head_pd_registration_input: "headPdRegistration",
      attorney_address_1_input: "attorneyAddress1",
      attorney_address_2_input: "attorneyAddress2",
      attorney_address_3_input: "attorneyAddress3",
      attorney_address_4_input: "attorneyAddress4",
      attorney_telephone_input: "attorneyTelephone",
      attorney_fax_input: "attorneyFax",
      attorney_email_input: "attorneyEmail"
  };

  Object.entries(fields).forEach(([inputId, infoKey]) => {
      $(`#${inputId}`).on("input", function() {
          attorneyInfo[infoKey] = $(this).val().trim();
          // Remove validation state when user starts typing
          $(this).removeClass('is-invalid');
          $(this).next('.invalid-feedback').remove();
      });
  });

  // Attorney type toggle listener
  $("#attorney_type_toggle").on("change", function() {
      attorneyInfo.isPublicDefender = $(this).is(":checked");
      updateFieldVisibility();
  });
}

// Add click handlers for attorney info form
function attachAttorneyInfoHandlers() {
  // Helper function to reset form to saved values
  async function resetFormToSavedValues() {
      await loadAttorneyInfo(); // Reload saved values from storage
      updateFormFields();       // Update form with saved values
  }

  // Show form when clicking any part of the attorney info display
  $(document).on("click", "#attorney_info_display, #attorney_info_display a", async function(e) {
      e.preventDefault();
      await resetFormToSavedValues(); // Reset to saved values before showing
      $("#attorney_info_container").show();
      $("#attorney_info_container").get(0).scrollIntoView({ behavior: "smooth" }); // Scroll to form
  });

  // Confirm button handler with validation
  $(document).on("click", "#confirm_attorney_info", async function() {
      if (!validateAttorneyInfo()) {
          return; // Don't proceed if validation fails
      }
      await saveAttorneyInfo();
      $("#attorney_info_container").hide();
  });

  // Cancel button handler
  $(document).on("click", "#cancel_attorney_info", async function() {
      // Clear all validation states
      $("#attorney_info_container input").removeClass('is-invalid');
      $("#attorney_info_container .invalid-feedback").remove();
      $("#attorney_info_container").hide();
      
      // Reset to saved values when cancelling
      await resetFormToSavedValues();
  });

  // Add input handlers to remove validation state when user starts typing
  $("#attorney_info_container input").on('input', function() {
      $(this).removeClass('is-invalid');
      $(this).next('.invalid-feedback').remove();
  });

  // Update required fields when attorney type changes
  $("#attorney_type_toggle").on("change", async function() {
      // Clear validation states when switching types
      $("#attorney_info_container input").removeClass('is-invalid').next('.invalid-feedback').remove();
      // Update the attorneyInfo object with the new type
      attorneyInfo.isPublicDefender = $(this).is(":checked");
      updateFieldVisibility();
  });
}


// Handle attorney info field visibility
function updateFieldVisibility() {
  if (attorneyInfo.isPublicDefender) {
    $("#public_defender_fields").show();
    $("#private_attorney_fields").hide();
  } else {
    $("#public_defender_fields").hide();
    $("#private_attorney_fields").show();
  }
}

// Get date components for document generation
function getDateComponents(dateString) {
  if (!dateString) return { month: "", day: "", year: "" };

  const date = new Date(dateString);
  return {
    month: (date.getMonth() + 1).toString(), // getMonth() is 0-based
    day: date.getDate().toString(),
    year: date.getFullYear().toString(),
  };
}

////////////////////////////// FORM VALIDATION /////////////////////////////
// Validate warrant recall details form entry
function validateWarrantDetails() {
  const fields = [
      {
          id: 'consultation_date_input',
          label: 'Consultation Date'
      },
      {
          id: 'consult_verb_phrase_input',
          label: 'Consultation Details'
      },
      {
          id: 'non_appearance_date_input',
          label: 'Non-appearance Date'
      },
      {
          id: 'warrant_issue_date_input',
          label: 'Warrant Issue Date'
      },
      {
          id: 'warrant_amount_input',
          label: 'Warrant Amount'
      }
  ];

  // Clear previous validation states
  fields.forEach(field => {
      const input = $(`#${field.id}`);
      if (!input.hasClass('is-invalid')) {
          input.addClass('form-control');
      }
      // Remove any existing feedback elements
      input.next('.invalid-feedback').remove();
      // Remove invalid class
      input.removeClass('is-invalid');
  });

  let isValid = true;
  
  // Required field validation
  fields.forEach(field => {
      const input = $(`#${field.id}`);
      const value = input.val().trim();
      
      if (!value) {
          isValid = false;
          input.addClass('is-invalid');
          input.after(`<div class="invalid-feedback">${field.label} is required</div>`);
      }
  });

  // If required fields aren't filled, don't proceed with date validation
  if (!isValid) return false;

  // Warrant amount validation
  const warrantAmount = $("#warrant_amount_input").val().trim();
  // Remove any non-numeric characters except decimal point and negative sign
  const numericAmount = parseFloat(warrantAmount.replace(/[^\d.-]/g, ''));
  
  if (isNaN(numericAmount)) {
      isValid = false;
      $("#warrant_amount_input").addClass('is-invalid');
      $("#warrant_amount_input").after(
          '<div class="invalid-feedback">Warrant amount must be a valid number</div>'
      );
  } else if (numericAmount < 0) {
      isValid = false;
      $("#warrant_amount_input").addClass('is-invalid');
      $("#warrant_amount_input").after(
          '<div class="invalid-feedback">Warrant amount cannot be negative</div>'
      );
  }

  // Date sequence validation
  const consultationDate = new Date($("#consultation_date_input").val());
  const nonAppearanceDate = new Date($("#non_appearance_date_input").val());
  const warrantIssueDate = new Date($("#warrant_issue_date_input").val());

  // Clear any previous date validation states
  const dateFields = ['consultation_date_input', 'non_appearance_date_input', 'warrant_issue_date_input'];
  dateFields.forEach(fieldId => {
      $(`#${fieldId}`).removeClass('is-invalid').next('.invalid-feedback').remove();
  });

  // Validate non-appearance date is not after warrant issue date
  if (nonAppearanceDate > warrantIssueDate) {
      isValid = false;
      $("#non_appearance_date_input").addClass('is-invalid');
      $("#non_appearance_date_input").after(
          '<div class="invalid-feedback">Non-appearance date cannot be after warrant issue date</div>'
      );
      $("#warrant_issue_date_input").addClass('is-invalid');
      $("#warrant_issue_date_input").after(
          '<div class="invalid-feedback">Warrant issue date cannot be before non-appearance date</div>'
      );
  }

  // Validate consultation date is not before other dates
  if (consultationDate < nonAppearanceDate || consultationDate < warrantIssueDate) {
      isValid = false;
      $("#consultation_date_input").addClass('is-invalid');
      $("#consultation_date_input").after(
          '<div class="invalid-feedback">Consultation date must be after both non-appearance and warrant issue dates</div>'
      );
  }

  return isValid;
}

// Validate warrant recall details values prior to generating document
async function validateGenerateWarrantDetails() {
  const cases = await getCases();
  console.log('Cases for warrant validation:', cases);
  
  let hasValidWarrantCase = false;
  let warrantDetailsValid = true;
  let message = '';

  for (const caseData of cases) {
      if (isWarrantStatusSufficientForPaperwork(
          caseData?.warrantStatus, 
          caseData?.OverrideWarrant
      )) {
          hasValidWarrantCase = true;
          const details = await loadWarrantDetails(caseData.CaseNumber);
          console.log(`Warrant details for case ${caseData.CaseNumber}:`, details);
          
          // Check required fields
          if (!details?.consultationDate || 
              !details?.consultVerbPhrase || 
              !details?.nonAppearanceDate || 
              !details?.warrantIssueDate || 
              !details?.warrantAmount) {
              warrantDetailsValid = false;
              message = 'Complete recall details must be entered for each case';
              console.log('Missing required warrant details');
              break;
          }

          console.log('Consultation Date:', details.consultationDate);
          console.log('Non-Appearance Date:', details.nonAppearanceDate);
          console.log('Warrant Issue Date:', details.warrantIssueDate);

          // Validate dates
          const consultDate = new Date(details.consultationDate + 'T00:00:00');
          const nonAppearDate = new Date(details.nonAppearanceDate + 'T00:00:00');
          const warrantDate = new Date(details.warrantIssueDate + 'T00:00:00');

          console.log('Date validation:', {
              consultDate,
              nonAppearDate,
              warrantDate
          });

          if (nonAppearDate > warrantDate || 
              consultDate < nonAppearDate || 
              consultDate < warrantDate) {
              warrantDetailsValid = false;
              message = 'Invalid date sequence in warrant details';
              console.log('Invalid date sequence');
              break;
          }

          // Validate warrant amount
          const amount = parseFloat(details.warrantAmount.replace(/[^\d.-]/g, ''));
          console.log('Warrant amount validation:', amount);
          
          if (isNaN(amount) || amount < 0) {
              warrantDetailsValid = false;
              message = 'Invalid warrant amount';
              break;
          }
      }
  }

  if (!hasValidWarrantCase) {
      console.log('No valid warrant cases found');
      return [false, 'No cases with active warrants found'];
  }

  console.log('Warrant validation result:', {
      warrantDetailsValid,
      message
  });

  return [warrantDetailsValid, message];
}


// Validate attorney info form entry
function validateAttorneyInfo() {
  // Clear all previous validation states
  $("#attorney_info_container input").removeClass('is-invalid').next('.invalid-feedback').remove();

  let isValid = true;

  // Always required fields
  const alwaysRequired = [
      { id: 'attorney_name_input', label: 'Attorney Name' },
      { id: 'attorney_registration_input', label: 'Attorney Registration' }
  ];

  // Validate always required fields
  alwaysRequired.forEach(field => {
      const input = $(`#${field.id}`);
      if (!input.val().trim()) {
          isValid = false;
          input.addClass('is-invalid');
          input.after(`<div class="invalid-feedback">${field.label} is required</div>`);
      }
  });

  // Check if public defender
  const isPublicDefender = $("#attorney_type_toggle").is(":checked");

  if (isPublicDefender) {
      // Public defender specific required fields
      const pdRequired = [
          { id: 'head_pd_name_input', label: 'Head Public Defender Name' },
          { id: 'head_pd_registration_input', label: 'Head Public Defender Registration' }
      ];

      pdRequired.forEach(field => {
          const input = $(`#${field.id}`);
          if (!input.val().trim()) {
              isValid = false;
              input.addClass('is-invalid');
              input.after(`<div class="invalid-feedback">${field.label} is required</div>`);
          }
      });
  } else {
      // Private attorney specific required fields
      const privateRequired = [
          { id: 'attorney_address_1_input', label: 'Address Line 1' },
          { id: 'attorney_address_2_input', label: 'Address Line 2' },
          { id: 'attorney_telephone_input', label: 'Telephone' }
      ];

      privateRequired.forEach(field => {
          const input = $(`#${field.id}`);
          if (!input.val().trim()) {
              isValid = false;
              input.addClass('is-invalid');
              input.after(`<div class="invalid-feedback">${field.label} is required</div>`);
          }
      });
  }

  return isValid;
}

// Validate attorney info values prior to generating document
async function validateGenerateAttorneyInfo() {
  const info = await new Promise(resolve => {
      chrome.storage.local.get('attorneyInfo', result => {
          resolve(result.attorneyInfo || {});
      });
  });

  console.log('Attorney info for validation:', info);

  // Required for both types
  if (!info.attorneyName?.trim() || !info.attorneyRegistration?.trim()) {
      return [false, 'Missing attorney name & registration'];
  }

  if (info.isPublicDefender) {
      if (!info.headPdName?.trim() || !info.headPdRegistration?.trim()) {
          return [false, 'Missing Head Public Defender information'];
      }
  } else {
      if (!info.attorneyAddress1?.trim() || 
          !info.attorneyAddress2?.trim() || 
          !info.attorneyTelephone?.trim()) {
          return [false, 'Missing private attorney address & telephone'];
      }
  }

  return [true, ''];
}

// Validate generate documents button against attorney info and warrant recall details
async function validateGenerateButton() {
  const currentMode = await new Promise(resolve => {
      chrome.storage.local.get('toolMode', result => {
          resolve(result.toolMode || 'expungement');
      });
  });

  if (currentMode === 'warrant') {
      // Check attorney info first
      const [attorneyValid, attorneyMessage] = await validateGenerateAttorneyInfo();
      if (!attorneyValid) {
          return [false, attorneyMessage];
      }

      // Then check warrant details
      const [warrantValid, warrantMessage] = await validateGenerateWarrantDetails();
      if (!warrantValid) {
          return [false, warrantMessage];
      }
  }
  
  return [true, '']; // Always valid in expungement mode or if all checks pass
}

async function updateGenerateButtonState() {
  const generateButton = $('#generate_documents_button');
  const alertContainer = $('#validation-alert-container');
  const [isValid, message] = await validateGenerateButton();
  
  // Update button appearance
  generateButton.removeClass('btn-primary btn-secondary')
               .addClass(isValid ? 'btn-primary' : 'btn-secondary');
  
  // Clear any existing alerts
  alertContainer.empty();
  
  // Show validation message in a prominent alert if invalid
  if (!isValid && message) {
    // Create and show Bootstrap alert
    const alert = $(`
      <div class="alert alert-danger alert-dismissible fade show" role="alert">
        <strong>Cannot Generate Documents:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `);
    
    // Add alert with animation
    alertContainer.append(alert);
    
    // Scroll the alert into view
    alert[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Optional: Add subtle pulse animation to draw attention
    alert.css('animation', 'pulse 2s');
  }
  
  // Keep the tooltip as a secondary indicator
  const existingTooltip = bootstrap.Tooltip.getInstance(generateButton[0]);
  if (existingTooltip) {
    existingTooltip.dispose();
  }
  
  if (!isValid && message) {
    new bootstrap.Tooltip(generateButton[0], {
      title: message,
      placement: 'top',
      trigger: 'hover'
    });
  }
}
// async function updateGenerateButtonState() {
//   const generateButton = $('#generate_documents_button');
//   const [isValid, message] = await validateGenerateButton();
  
//   // Store validation state on the button element
//   generateButton.data('isValid', isValid);
//   generateButton.data('validationMessage', message);
  
//   // Just update visual appearance, don't disable
//   generateButton.removeClass('btn-primary btn-secondary')
//                .addClass(isValid ? 'btn-primary' : 'btn-secondary');
  
//   // Clean up any existing tooltip
//   const existingTooltip = bootstrap.Tooltip.getInstance(generateButton[0]);
//   if (existingTooltip) {
//       existingTooltip.dispose();
//   }
  
//   // Set up tooltip if there's a validation message and not valid
//   if (!isValid && message) {
//       const tooltip = new bootstrap.Tooltip(generateButton[0], {
//           title: message,
//           placement: 'top',
//           trigger: 'hover'
//       });
//   }
// }

// Add event listeners for button hover
function initializeGenerateButtonTooltip() {
  const generateButton = $('#generate_documents_button');
  
  generateButton.on('mouseenter', function() {
      if ($(this).prop('disabled')) {
          $(this).tooltip('show');
      }
  }).on('mouseleave', function() {
      if ($(this).data('bs-tooltip')) {
          $(this).tooltip('hide');
      }
  });
}


////////////////////////////////////////////////////////////////////////////

// Initialize Bootstrap tooltips
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

// Helper function to get the appropriate CSS class for expungeability status
function getExpungeabilityClass(status) {
  let normalizedStatus = status.toLowerCase();

  if (
    normalizedStatus === "all expungeable" ||
    normalizedStatus === "expungeable"
  ) {
    return "bg-success text-white";
  } else if (
    normalizedStatus === "none expungeable" ||
    normalizedStatus === "not expungeable"
  ) {
    return "bg-danger text-white";
  } else if (
    normalizedStatus === "some expungeable" ||
    normalizedStatus.includes("possibly expungeable") ||
    normalizedStatus.includes("all possibly expungeable") ||
    normalizedStatus.includes("expungeable after")
  ) {
    return "bg-warning text-dark";
  } else if (
    normalizedStatus.includes("deferred") ||
    normalizedStatus.includes("statute") ||
    normalizedStatus.includes("at 21") ||
    normalizedStatus.includes("1st expungeable") ||
    normalizedStatus.includes("1st/2nd expungeable")
  ) {
    return "bg-warning text-dark";
  } else {
    // Fallback for any other status, e.g., "Pending"
    return "bg-warning text-dark";
  }
}

// Update popup with case information
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  // Check if the message contains the "Assessment" property
  if (message.hasOwnProperty("Assessment")) {
    console.log("Received Assessment:", message["Assessment"]);
    var eligibility = message["Assessment"];
    // Conditionally add class based on the eligibility status
    switch (eligibility) {
      case "All Charges Expungeable":
        $("#assessment").addClass("text-success");
        break;
      case "No Charges Expungeable":
        $("#assessment").addClass("text-danger");
        break;
      case "Partially Expungeable":
        $("#assessment").addClass("text-warning");
        break;
      default:
        $("#assessment").addClass("text-warning");
    }
    displayCases();
  } else if (message.hasOwnProperty("Client Name")) {
    console.log("Client Name Received");
    console.log("Received Client Name:", message["Client Name"]);
    displayClientInfo();
  }
});

// Run both functions when the popup is opened
displayCases();
displayClientInfo();
