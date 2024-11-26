/////////////// DOCUMENT GENERATION FUNCTIONS ///////////////
/////////////// WARNING: INCOMPLETE ///////////////


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
async function generateExpungementPDF(pdfUrl) {
  console.log("Starting generateExpungementPDF function");

  // Fetch the PDF data from a URL
  const response = await fetch(pdfUrl);
  const pdfBytes = await response.arrayBuffer();

  try {
    var cases = await getCases();
    console.log("Cases obtained:", cases);

    // Group cases by normalized client name
    const clientCases = {};
    cases.forEach((caseObj) => {
      const normalizedName = normalizeDefendantName(caseObj.DefendantName);
      if (!clientCases[normalizedName]) clientCases[normalizedName] = [];
      clientCases[normalizedName].push(caseObj);
    });

    console.log("Grouped cases by normalized client name:", clientCases);

    for (const [normalizedName, clientCaseList] of Object.entries(clientCases)) {
      console.log(`Processing client: ${normalizedName}`);
      let client = createClientObject(normalizedName);
      console.log("Created client object:", client);

      // Initialize new PDF for the client
      let pdfDoc = await initializeNewPDF(pdfBytes, client);

      // Add a new page to the PDF document
      let newPage = pdfDoc.addPage([600, 400]);

      // Additional processing would occur here

      // Download the PDF for the client
      await downloadPDF(pdfDoc, client);
    }
  } catch (error) {
    console.error("Error in generateExpungementPDF:", error);
  }

  console.log("Finished generateExpungementPDF function");
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

async function generateExpungementLetter(caseObj, client, letterName) {
  // ...existing code...
}

async function generateAndDownloadDOCX(zip, client, caseNumber) {
  // ...existing code...
}

function handleOptionalParagraphs(content) {
  // ...existing code...
}

// Export functions to be accessible from popup.js
window.generateExpungementPDF = generateExpungementPDF;
// ...export other functions as needed...
