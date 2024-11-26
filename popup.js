let alternateFirstName = "";
let alternateMiddleName = "";
let alternateLastName = "";
let alternateSex = "";

let currentMode = "expungement"; // Default mode (can be 'expungement' or 'warrant')

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

// FINAL DETERMINATION OF EXPUNGEABILITY TO DECIDE WHETHER TO GENERATE EXPUNGEMENT PAPERWORK
function isExpungeableEnoughForPaperwork(expungeableStatus, override) {
  return (
    expungeableStatus === "All Expungeable" ||
    //expungeableStatus === "Some Expungeable" ||
    //expungeableStatus === "All Possibly Expungeable" ||
    override
  );
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

// Function to load alternate names and address from Chrome storage
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
      (result) => {
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
        console.log("Alternate info loaded:", {
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

async function loadCourtAddresses() {
  const response = await fetch(chrome.runtime.getURL("court_addresses.json"));
  return await response.json();
}

function findCourtAddress(courtAddresses, location) {
  for (const circuit of courtAddresses.circuits) {
    for (const court of circuit.courts) {
      if (court.location.some((loc) => location.includes(loc))) {
        return {
          name: court.name,
          address: court.address,
        };
      }
    }
  }
  return null;
}

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

  // Use alternate names if they exist
  // lastName = alternateLastName || lastName;
  // firstName = alternateFirstName || firstName;
  // middleName = alternateMiddleName || middleName;

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

async function initializeNewPDF(pdfBytes, client) {
  const pdfDoc = await window.PDFLib.PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  // Get fields to fill out
  const clientNameField = form.getTextField("Client_Name");
  const clientHomeAddressField = form.getTextField("Home_Address");
  const clientMailingAddressField = form.getTextField("Mailing_Address");
  const clientPhoneField = form.getTextField("Phone_Number");
  const clientEmailField = form.getTextField("Email");
  const clientDOBField = form.getTextField("Date of Birth");
  const signingDateField = form.getTextField("Signing_Date");
  const sexField = form.getRadioGroup("Sex");

  const clientAddressOneLine = [
    alternateAddressLine1,
    alternateAddressLine2,
    alternateAddressLine3,
  ]
    .filter(Boolean)
    .join(", ");

  // Fill out the fields
  clientNameField.setText(client["PDF Name"]);
  clientHomeAddressField.setText(clientAddressOneLine);
  clientMailingAddressField.setText(clientAddressOneLine);
  clientPhoneField.setText(alternatePhone);
  clientEmailField.setText(alternateEmail);
  clientDOBField.setText(alternateDOB);
  signingDateField.setText(
    new Date().toLocaleDateString("en-US", {
      timeZone: "HST",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );

  if (alternateSex) {
    sexField.select(alternateSex);
  }

  return pdfDoc;
}

function initializeNewPage(page, clientName) {
  page.drawText(`Client: ${clientName}`, {
    x: 50,
    y: page.getHeight() - 50,
    size: 12,
  });

  const formattedDate = new Date().toLocaleString("en-US", { timeZone: "HST" });
  page.drawText(`Date and Time (HST): ${formattedDate}`, {
    x: 50,
    y: page.getHeight() - 70,
    size: 10,
  });

  page.drawText(`Cases Reviewed For Expungement`, {
    x: 50,
    y: page.getHeight() - 90,
    size: 10,
  });

  return page.getHeight() - 110;
}

function addCaseToPage(page, caseObj, yPosition) {
  page.drawText(`Case Number: ${caseObj.CaseNumber}: ${caseObj.Expungeable}`, {
    x: 50,
    y: yPosition,
    size: 10,
  });
  return yPosition - 20;
}

async function generateExpungementLetter(caseObj, client, letterName) {
  // Find court address
  const courtLocation = caseObj.CourtLocation;
  const courtAddresses = await loadCourtAddresses();
  const caseNumber = caseObj.CaseNumber;

  const courtInfo = findCourtAddress(courtAddresses, courtLocation);
  log(`Generating letter for case ${caseNumber} at ${courtLocation}`);

  let courtName = "";
  let courtAddress1 = "";
  let courtAddress2 = "";
  let courtAddress3 = "";

  if (courtInfo) {
    courtName = courtInfo.name;
    [courtAddress1, courtAddress2, courtAddress3 = ""] = courtInfo.address;
    log(`Court location: ${courtLocation}`);
    log(`Court name: ${courtName}`);
    log(`Court address: ${courtAddress1}, ${courtAddress2}, ${courtAddress3}`);
  } else {
    log(`Court address not found for location: ${courtLocation}`);
  }

  // Letter date
  const letterDate = new Date().toLocaleDateString("en-US", {
    timeZone: "HST",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  /////////////////////////////// ZIP OPERATIONS ///////////////////////////////
  // Read in the entire zip archive (stored with docx extension)
  // Also load the document.xml file within the archive
  const templateUrl = chrome.runtime.getURL("expungement_letter_template.docx");
  const templateResponse = await fetch(templateUrl);
  const templateArrayBuffer = await templateResponse.arrayBuffer();

  const zip = await JSZip.loadAsync(templateArrayBuffer);
  let documentXmlContent = await zip.file("word/document.xml").async("string");

  // Handle paragraphs that need to be removed or replaced
  documentXmlContent = handleOptionalParagraphs(documentXmlContent);

  // Perform find-and-replace operations
  const placeholderToValue = {
    κ: letterName,
    δ: letterDate,
    τ: caseNumber,
    μ: alternateAddressLine1,
    ν: alternateAddressLine2,
    ε: courtName,
    ζ: courtAddress1,
    η: courtAddress2,
    θ: courtAddress3,
  };

  for (const [placeholder, value] of Object.entries(placeholderToValue)) {
    documentXmlContent = documentXmlContent.replace(
      new RegExp(placeholder, "g"),
      value || ""
    );
  }

  // Replace the document.xml in the template archive with the modified version
  zip.file("word/document.xml", documentXmlContent);

  // Generate and download the DOCX file from the entire modified zip
  await generateAndDownloadDOCX(zip, client, caseNumber);
}

// Helper function to handle optional paragraphs
function handleOptionalParagraphs(content) {
  if (alternateAddressLine3) {
    content = content.replace("ξ", alternateAddressLine3);
  } else {
    content = content.replace(
      /<w:p w14:paraId="20DEE2BC".*?ξ<\/w:t><\/w:r><\/w:p>/,
      ""
    );
  }

  if (alternatePhone) {
    content = content.replace("φ", alternatePhone);
  } else {
    content = content.replace(
      /<w:p w14:paraId="32400D1D".*?φ<\/w:t><\/w:r><\/w:p>/,
      ""
    );
  }

  if (alternateEmail) {
    content = content.replace("ω", alternateEmail);
  } else {
    content = content.replace(
      /<w:p w14:paraId="011CD49E".*?ω<\/w:t><\/w:r><\/w:p>/,
      ""
    );
  }

  return content;
}

// Helper function to generate and download DOCX
async function generateAndDownloadDOCX(zip, client, caseNumber) {
  try {
    console.log("Starting DOCX generation...");
    const zipContent = await zip.generateAsync({ type: "blob" });

    const docxDownloadLink = document.createElement("a");
    docxDownloadLink.href = URL.createObjectURL(zipContent);
    docxDownloadLink.download = `${
      client["Last Name"] || "name_unavailable"
    }_letter_${caseNumber}.docx`;

    document.body.appendChild(docxDownloadLink);
    docxDownloadLink.click();
    document.body.removeChild(docxDownloadLink);

    console.log("DOCX file generated and download initiated.");
  } catch (error) {
    console.error("Error generating DOCX file:", error);
  }
}

async function downloadPDF(pdfDoc, client) {
  console.log(`Starting PDF download for client: ${client["PDF Name"]}`);
  try {
    const modifiedPdfBytes = await pdfDoc.save();
    console.log("PDF saved successfully");

    const blob = new Blob([modifiedPdfBytes], { type: "application/pdf" });
    console.log("Blob created successfully");

    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${
      client["Last Name"] || "name_unavailable"
    }_form_and_summary.pdf`;
    console.log(`Download link created: ${downloadLink.download}`);

    document.body.appendChild(downloadLink);
    downloadLink.click();
    console.log("Download link clicked");

    document.body.removeChild(downloadLink);
    console.log("Download link removed from document");
  } catch (error) {
    console.error("Error in downloadPDF:", error);
  }
}

async function generateExpungementPDF(pdfUrl) {
  console.log("Starting generateExpungementPDF function");

  // Get the most up-to-date values from the input fields
  alternateFirstName = $("#alternate_first_name_input").val().trim();
  alternateMiddleName = $("#alternate_middle_name_input").val().trim();
  alternateLastName = $("#alternate_last_name_input").val().trim();
  console.log("Generating PDF with alternate names:", {
    alternateFirstName,
    alternateMiddleName,
    alternateLastName,
  });

  // Fetch the PDF data from a URL
  const response = await fetch(pdfUrl);
  const pdfBytes = await response.arrayBuffer();

  try {
    console.log("Court addresses loaded successfully");

    var cases = await getCases();
    console.log("Cases obtained:", cases);

    // Group cases by normalized client name
    const clientCases = {};
    cases.forEach((caseObj) => {
      const normalizedName = normalizeDefendantName(caseObj.DefendantName);
      if (!clientCases[normalizedName]) {
        clientCases[normalizedName] = [];
      }
      clientCases[normalizedName].push(caseObj);
    });

    console.log("Grouped cases by normalized client name:", clientCases);

    for (const [normalizedName, clientCaseList] of Object.entries(
      clientCases
    )) {
      console.log(`Processing client: ${normalizedName}`);
      let client = createClientObject(normalizedName);
      console.log("Created client object:", client);

      // Initialize new PDF for the client
      let pdfDoc = await initializeNewPDF(pdfBytes, client);
      let newPage = pdfDoc.addPage([600, 400]);
      let yPosition = initializeNewPage(newPage, client["PDF Name"]);

      let hasExpungeableCase = false;
      let expungeableLettersGenerated = 0;

      console.log(
        `Processing ${clientCaseList.length} cases for client ${normalizedName}`
      );
      for (const caseObj of clientCaseList) {
        console.log(`Processing case: ${caseObj.CaseNumber}`);
        // Add case to the PDF
        yPosition = addCaseToPage(newPage, caseObj, yPosition);

        /////////////////////// FINAL EXPUNGEMENT LOGIC ///////////////////////
        // Generate letter for expungeable cases
        if (
          isExpungeableEnoughForPaperwork(caseObj.Expungeable, caseObj.Override)
          // caseObj.Expungeable === "All Expungeable" ||
          // caseObj.Expungeable === "Some Expungeable" ||
          // caseObj.Expungeable === "Some Expungeable" ||
          // caseObj.Expungeable === "All Possibly Expungeable" ||
          // caseObj.Override // Override and generate letter for case
        ) {
          console.log(
            `Generating expungement letter for case: ${caseObj.CaseNumber}`
          );
          await generateExpungementLetter(
            caseObj,
            client,
            client["Letter Name"]
          );
          hasExpungeableCase = true;
          expungeableLettersGenerated++;
        }

        // If we're running out of space on the current page, add a new page
        if (yPosition < 50) {
          console.log("Adding new page to PDF");
          newPage = pdfDoc.addPage([600, 400]);
          yPosition = initializeNewPage(newPage, client["PDF Name"]);
        }
      }

      // Download the client's PDF if they have at least one expungeable case
      if (hasExpungeableCase) {
        console.log(`Downloading PDF for client: ${client["PDF Name"]}`);
        console.log(
          `Expungeable letters generated: ${expungeableLettersGenerated}`
        );
        await downloadPDF(pdfDoc, client);
      } else {
        console.log(
          `No expungeable cases for client: ${client["PDF Name"]}, skipping PDF download`
        );
      }
    }
  } catch (error) {
    console.error("Error in generateExpungementPDF:", error);
  }

  console.log("Finished generateExpungementPDF function");
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
  console.log("Loading alternate info");

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

  // Add event listener for the confirm button
  $("#confirm_name_override")
    .off("click")
    .on("click", async function () {
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
      await displayCases(); // Refresh the cases display with new names
    });

  // Add event listener for the cancel button
  $("#cancel_name_override")
    .off("click")
    .on("click", function () {
      updateInputFields(); // Reset input fields to current values
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

function updateInputFields() {
  $("#alternate_first_name_input").val(alternateFirstName);
  $("#alternate_middle_name_input").val(alternateMiddleName);
  $("#alternate_last_name_input").val(alternateLastName);
}

async function displayCases() {
  var allcases = await getCases();
  console.log("Displaying Cases");

  let html = "<table class='table table-striped'>";
  html +=
    "<thead><tr><th scope='col'>Case Number</th><th scope='col' id='defendant-header' style='cursor: pointer;'>Defendant</th><th scope='col'>Assessment</th><th scope='col'>Override</th></tr></thead>";
  html += "<tbody>";

  if (allcases.length != 0) {
    for (var x = allcases.length - 1; x >= 0; x--) {
      html += "<tr scope='row'>";
      // Case number cell
      html += `<td><a href="#" class="case-link" data-case-index="${x}">${allcases[
        x
      ]["CaseNumber"].trim()}</a></td>`;

      // Defendant name cell
      html += "<td><span>" + formatDefendantName(allcases[x]) + "</span></td>";

      // Assessment cell based on mode
      if (currentMode === "expungement") {
        html += generateExpungeabilityCell(allcases[x]);
      } else {
        html += generateWarrantStatusCell(allcases[x]);
      }

      // Override cell based on mode
      html += generateOverrideCell(allcases[x], currentMode);

      html += "</tr>";
    }
  } else {
    html += "<tr><td colspan='4'>No cases found</td></tr>";
  }

  html += "</tbody></table>";

  $("#tablediv").html(html);
  attachEventListeners(allcases);
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
      statusText = "Outstanding Warrant";
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
  }
  return "<td></td>"; // Empty override column in warrant mode
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
      cases[caseIndex].Override = isOverridden;
      chrome.storage.local.set({ cases: cases }, function () {
        console.log(
          `Override status updated for case ${caseNumber}: ${isOverridden}`
        );
        // Refresh the cases display to reflect the updated override status
        displayCases();
      });
    } else {
      console.error(`Case ${caseNumber} not found in storage`);
    }
  });
}

// When the popup opens
document.addEventListener("DOMContentLoaded", async function () {
  console.log("DOM loaded");
  
  const radioButtons = document.querySelectorAll('input[name="tool-mode"]');
  console.log("Found radio buttons:", radioButtons);
  
  radioButtons.forEach(radio => {
      console.log("Adding listener to:", radio.id);
      radio.addEventListener('change', async function() {
          console.log('Mode switch clicked:', this.value);
          if (this.checked) {
              await saveMode(this.value);
              console.log('Current mode after save:', currentMode);
              
              // Check if we're in case details view
              const isInCaseDetails = $('#charges-container').length > 0;
              if (isInCaseDetails) {
                  // Find the case data and refresh the details view
                  const cases = await getCases();
                  const caseNumber = $('#case-number').text();
                  const caseData = cases.find(c => c.CaseNumber === caseNumber);
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

  await loadMode();
  await displayClientInfo();
  await displayCases();
});
// document.addEventListener("DOMContentLoaded", async function () {
//   console.log("DOM loaded"); // Debug

//   const radioButtons = document.querySelectorAll('input[name="tool-mode"]');
//   radioButtons.forEach((radio) => {
//     radio.addEventListener("change", async function () {
//       console.log("Mode switch clicked:", this.value);
//       if (this.checked) {
//         await saveMode(this.value);
//         await displayCases();
//       }
//     });
//   });

//   await loadMode();
//   await displayClientInfo();
//   await displayCases();
// });

//Starts the Content Script to add a Case
jQuery("#evaluate_case_button").click(function () {
  console.log("evaluate_case_button Case Button Clicked");
  chrome.runtime.sendMessage({ action: "check_expungeability" });
});

//Starts the Content Script to open cases from the search page
jQuery("#overview_button").click(function () {
  console.log("overview_button Case Button Clicked");
  chrome.runtime.sendMessage({ action: "overview_page" });
});

//Download PDF
jQuery("#generate_pdf_button").click(async function () {
  console.log("Generate PDF button clicked");
  await generateExpungementPDF("ExpungementForm.pdf");
});

//Empties Cases and Client from local Storage
jQuery("#emptycases").click(function () {
  console.log("Deleting Client and Cases");
  chrome.storage.local.clear(function () {
    var error = chrome.runtime.lastError;
    if (error) {
      console.error(error);
    }
    chrome.runtime.sendMessage({ action: "overview_page" });
    displayClientInfo();
    displayCases();
  });
});

// Generate warrant history table for use with displayCaseDetails function
function generateWarrantHistoryTable(warrantEntries) {
  if (!warrantEntries || warrantEntries.length === 0) return "";

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
              <td>${entry.date}</td>
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
  ];

  // Helper function to check if a value is blank
  const isBlank = (value) => {
    return value === null || value === undefined || String(value).trim() === "";
  };

  // Helper function to format property values
  const formatValue = (key, value) => {
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    return value;
  };

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
    // Create a copy of caseData.additionalFactors
    let additionalFactorsProcessed = { ...caseData.additionalFactors };
    // Handle "Deferred Acceptance" additional factor value (really only indicates if deferred
    // acceptance is in docket, not if deferred acceptance is actually the disposition)
    if (additionalFactorsProcessed.deferredAcceptance === false) {
      additionalFactorsProcessed.deferredAcceptance =
        "Not in docket (check disposition and sentencing)";
    }

    // Replace "Warrant Status" with its explanation property and generate warrant history table
    // Recommend testing with 1CPC-22-0001376
    let warrantTableHtml = "";
    if (additionalFactorsProcessed?.warrantDetails) {
      // Generate warrant history table if warrantEntries exist
      if (additionalFactorsProcessed.warrantDetails.warrantEntries) {
        warrantTableHtml = generateWarrantHistoryTable(
          additionalFactorsProcessed.warrantDetails.warrantEntries
        );
      }
      additionalFactorsProcessed.warrantDetails =
        additionalFactorsProcessed.warrantDetails.explanation;
    }

    const factorsHtml = generatePropertiesHtml(additionalFactorsProcessed);
    if (factorsHtml) {
      $("#additional-factors-container").html(`
        <h4 class="mb-3">Additional Factors:</h4>
        <div class="card mb-3">
          <div class="card-body">
            ${factorsHtml}
          </div>
        </div>
      `);
    }

    // Append warrant history table if it exists
    if (warrantTableHtml) {
      console.log("Appending warrant history table");
      $("#additional-factors-container").append(warrantTableHtml);
    } else {
      console.log("No warrant history table to append");
    }
  }

  // Set overall expungeability
  /////////////////////// Set overall status ///////////////////////
  const overallStatusContainer = $("#overall-expungeability");
  if (currentMode === 'expungement') {
      overallStatusContainer.text(caseData.Expungeable);
      overallStatusContainer.addClass(getExpungeabilityClass(caseData.Expungeable));
  } else {
      // Create badge styling to match expungeability badge style
      const warrantStatus = caseData?.warrantStatus;
      let statusText = 'No Warrant Information';
      let badgeClass = 'badge '; // Base badge class
      
      if (warrantStatus) {
          if (warrantStatus.hasOutstandingWarrant) {
              statusText = 'Outstanding Warrant';
              badgeClass += 'bg-danger text-white';
          } else if (warrantStatus.warrantEntries?.length > 0) {
              statusText = 'No Outstanding Warrant';
              badgeClass += 'bg-success text-white';
          } else {
              badgeClass += 'bg-warning text-dark';
          }
      }

      // Replace the content with a badge span
      overallStatusContainer.html(`
          <span class="${badgeClass}" data-bs-toggle="tooltip" 
                data-bs-placement="top" title="${warrantStatus?.explanation || 'Unable to determine warrant status'}">
              ${statusText}
          </span>
      `);
  }
  // const overallExpungeability = $("#overall-expungeability");
  // overallExpungeability.text(caseData.Expungeable);
  // overallExpungeability.addClass(getExpungeabilityClass(caseData.Expungeable));

  // // Add click event listener to back button
  // $("#back-button").on("click", function () {
  //   displayCases();
  // });
}

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
