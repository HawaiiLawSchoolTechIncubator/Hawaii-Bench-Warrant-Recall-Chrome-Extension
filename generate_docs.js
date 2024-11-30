const DocumentGenerator = (function () {
  class DocumentGenerator {
    constructor() {
      this.attorneyInfo = null;
      this.alternateInfo = {
        firstName: "",
        middleName: "",
        lastName: "",
        addressLine1: "",
        addressLine2: "",
        addressLine3: "",
        phone: "",
        email: "",
        dob: "",
        sex: "",
      };

      this.headPdDefaults = null;
    }

    async initialize() {
      // Load default head PD data
      const defaultDataUrl = chrome.runtime.getURL("default_data.json");
      const defaultResponse = await fetch(defaultDataUrl);
      this.headPdDefaults = await defaultResponse.json();

      // Load alternate info
      await this.loadAlternateInfo();
    }

    ////////////////////////// Warrant Replacement Map //////////////////////////
    static WARRANT_TEMPLATES = {
      publicDefender: {
        filename: "bench_warrant_paperwork_public_defender.docx",
        mapping: {
          α: "attorneyName",
          β: "headPdName",
          γ: "headPdRegistration",
          ι: "attorneyRegistration",
          χ: "attorneySignatureLocation",
          κ: "defendantNameFull",
          τ: "caseNumber",
          λ: "warrantIssueMonth",
          μ: "warrantIssueDay",
          ν: "warrantIssueYear",
          ξ: "warrantAmount",
          ο: "nonAppearanceMonth",
          π: "nonAppearanceDay",
          ρ: "nonAppearanceYear",
          σ: "consultationMonth",
          ω: "consultationDay",
          υ: "consultationYear",
          ψ: "consultVerbPhrase",
          Ϝ: "circuitOrdinal",
        },
      },
      privateAttorney: {
        filename: "bench_warrant_paperwork_private_attorney.docx",
        mapping: {
          φ: "firmName",
          α: "attorneyName",
          β: "attorneyAddress1",
          γ: "attorneyAddress2",
          δ: "attorneyAddress3",
          ε: "attorneyAddress4",
          ζ: "attorneyTelephone",
          η: "attorneyFax",
          θ: "attorneyEmail",
          ι: "attorneyRegistration",
          χ: "attorneySignatureLocation",
          κ: "defendantNameFull",
          τ: "caseNumber",
          λ: "warrantIssueMonth",
          μ: "warrantIssueDay",
          ν: "warrantIssueYear",
          ξ: "warrantAmount",
          ο: "nonAppearanceMonth",
          π: "nonAppearanceDay",
          ρ: "nonAppearanceYear",
          σ: "consultationMonth",
          ω: "consultationDay",
          υ: "consultationYear",
          ψ: "consultVerbPhrase",
          Ϝ: "circuitOrdinal",
        },
      },
    };

    ////////////////////////// Load Attorney Info //////////////////////////
    async loadAttorneyInfo() {
      return new Promise((resolve) => {
        chrome.storage.local.get("attorneyInfo", (result) => {
          // Set default values for required fields
          this.attorneyInfo = {
            isPublicDefender: true, // Default value
            firmName: "",
            attorneyName: "",
            attorneyRegistration: "",
            attorneySignatureLocation: "",
            headPdName: "Jon N. Ikenaga",
            headPdRegistration: "6284",
            attorneyAddress1: "",
            attorneyAddress2: "",
            attorneyAddress3: "",
            attorneyAddress4: "",
            attorneyTelephone: "",
            attorneyFax: "",
            attorneyEmail: "",
            circuitOrdinal: "",
            ...result.attorneyInfo, // Overlay with stored values if they exist
          };
          resolve(this.attorneyInfo);
        });
      });
    }

    ////////////////////////// Load Alternate Client Info //////////////////////////

    async loadAlternateInfo() {
      const fields = [
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
      ];

      return new Promise((resolve) => {
        chrome.storage.local.get(fields, (result) => {
          this.alternateInfo = {
            firstName: result.alternateFirstName || "",
            middleName: result.alternateMiddleName || "",
            lastName: result.alternateLastName || "",
            addressLine1: result.alternateAddressLine1 || "",
            addressLine2: result.alternateAddressLine2 || "",
            addressLine3: result.alternateAddressLine3 || "",
            phone: result.alternatePhone || "",
            email: result.alternateEmail || "",
            dob: result.alternateDOB || "",
            sex: result.alternateSex || "",
          };
          resolve();
        });
      });
    }

    ////////// Load Warrant Details (function also present in popup.js for UI purposes) //////////
    async loadWarrantDetails(caseNumber) {
      if (!caseNumber) {
        console.warn("No case number provided to loadWarrantDetails");
        return null;
      }

      return new Promise((resolve) => {
        chrome.storage.local.get("warrantDetails", function (result) {
          if (result.warrantDetails && result.warrantDetails[caseNumber]) {
            console.log("Found warrant details for case:", caseNumber);
            resolve(result.warrantDetails[caseNumber]);
          } else {
            console.log("No warrant details found for case:", caseNumber);
            resolve({
              consultationDate: "",
              consultationTown: "",
              consultVerbPhrase: "",
              nonAppearanceDate: "",
              warrantIssueDate: "",
              warrantAmount: "",
            });
          }
        });
      });
    }

    ////////////////////////// Whether to Generate Documents //////////////////////////

    async generateAllDocuments(mode) {
      // Ensure initialization is complete
      await this.initialize();
      const cases = await this.getCases();
      if (mode == "expungement") {
        const clientCases = this.groupCasesByClient(cases);

        for (const [normalizedName, clientCaseList] of Object.entries(
          clientCases
        )) {
          await this.generateExpungementDocuments(
            normalizedName,
            clientCaseList
          );
        }
      } else if (mode == "warrant") {
        for (const caseObj of cases) {
          if (this.shouldGenerateWarrantPaperwork(caseObj)) {
            await this.generateWarrantDocuments(caseObj);
          }
        }
      } else {
        console.log(`Document generation not implemented for ${mode} mode`);
        return;
      }
    }

    isExpungeableEnoughForPaperwork(caseObj) {
      return caseObj.Expungeable === "All Expungeable" || caseObj.Override;
    }

    shouldGenerateWarrantPaperwork(caseObj) {
      return (
        caseObj.warrantStatus?.hasOutstandingWarrant || caseObj.OverrideWarrant
      );
    }

    ////////////////////////// Utility Methods //////////////////////////
    async getCases() {
      return new Promise((resolve) => {
        chrome.storage.local.get("cases", function (result) {
          resolve(result.cases || []);
        });
      });
    }

    groupCasesByClient(cases) {
      const clientCases = {};
      cases.forEach((caseObj) => {
        const normalizedName = this.normalizeDefendantName(
          caseObj.DefendantName
        );
        if (!clientCases[normalizedName]) {
          clientCases[normalizedName] = [];
        }
        clientCases[normalizedName].push(caseObj);
      });
      return clientCases;
    }

    normalizeDefendantName(name) {
      // Use alternate names if any exist
      if (
        this.alternateInfo.firstName ||
        this.alternateInfo.middleName ||
        this.alternateInfo.lastName
      ) {
        return `${this.alternateInfo.lastName}, ${this.alternateInfo.firstName} ${this.alternateInfo.middleName}`.trim();
      }

      // Original name normalization logic
      const nameParts = name.trim().split(/\s+/);
      let lastName, firstName, middleName;

      if (nameParts[0].endsWith(",")) {
        lastName = nameParts[0].slice(0, -1);
        firstName = nameParts[1] || "";
        middleName = nameParts.slice(2).join(" ");
      } else if (nameParts.length > 1) {
        lastName = nameParts[nameParts.length - 1];
        firstName = nameParts[0];
        middleName = nameParts.slice(1, -1).join(" ");
      } else {
        lastName = name.trim();
        firstName = "";
        middleName = "";
      }

      return `${lastName}, ${firstName} ${middleName}`.trim();
    }

    createClientObject(normalizedName) {
      const [lastName, firstMiddle] = normalizedName.split(", ");
      const [firstName, ...middleParts] = (firstMiddle || "").split(" ");
      const middleName = middleParts.join(" ");

      return {
        "Last Name": lastName,
        "First Name": firstName,
        "Middle Name": middleName,
        "PDF Name": normalizedName,
        "Letter Name": `${firstName} ${middleName} ${lastName}`.trim(),
      };
    }

    ////////////////////////// Generate Expungement Documents //////////////////////////
    selectWarrantTemplate() {
      const template =
        DocumentGenerator.WARRANT_TEMPLATES[
          this.attorneyInfo.isPublicDefender
            ? "publicDefender"
            : "privateAttorney"
        ];

      if (!template) {
        throw new Error("Could not determine appropriate warrant template");
      }

      return template;
    }

    async generateExpungementDocuments(normalizedName, clientCaseList) {
      const pdfTemplatePath = "ExpungementForm.pdf";
      const client = this.createClientObject(normalizedName);
      const pdfBytes = await this.loadPdfTemplate(pdfTemplatePath);
      const pdfDoc = await this.initializeNewPDF(pdfBytes, client);

      let newPage = pdfDoc.addPage([600, 400]);
      let yPosition = this.initializeNewPage(newPage, client["PDF Name"]);

      let hasExpungeableCase = false;

      for (const caseObj of clientCaseList) {
        yPosition = this.addCaseToPage(newPage, caseObj, yPosition);

        if (this.isExpungeableEnoughForPaperwork(caseObj)) {
          await this.generateExpungementLetterDOCX(
            caseObj,
            client,
            client["Letter Name"]
          );
          hasExpungeableCase = true;
        }

        if (yPosition < 50) {
          newPage = pdfDoc.addPage([600, 400]);
          yPosition = this.initializeNewPage(newPage, client["PDF Name"]);
        }
      }

      if (hasExpungeableCase) {
        await this.downloadPDF(pdfDoc, client);
      }
    }

    async loadPdfTemplate(path) {
      const response = await fetch(path);
      return await response.arrayBuffer();
    }

    async initializeNewPDF(pdfBytes, client) {
      const pdfDoc = await window.PDFLib.PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      const clientNameField = form.getTextField("Client_Name");
      const clientHomeAddressField = form.getTextField("Home_Address");
      const clientMailingAddressField = form.getTextField("Mailing_Address");
      const clientPhoneField = form.getTextField("Phone_Number");
      const clientEmailField = form.getTextField("Email");
      const clientDOBField = form.getTextField("Date of Birth");
      const signingDateField = form.getTextField("Signing_Date");
      const sexField = form.getRadioGroup("Sex");

      const clientAddressOneLine = [
        this.alternateAddressLine1,
        this.alternateAddressLine2,
        this.alternateAddressLine3,
      ]
        .filter(Boolean)
        .join(", ");

      clientNameField.setText(client["PDF Name"]);
      clientHomeAddressField.setText(clientAddressOneLine);
      clientMailingAddressField.setText(clientAddressOneLine);
      clientPhoneField.setText(this.alternatePhone);
      clientEmailField.setText(this.alternateEmail);
      clientDOBField.setText(this.alternateDOB);
      signingDateField.setText(
        new Date().toLocaleDateString("en-US", {
          timeZone: "HST",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );

      if (this.alternateSex) {
        sexField.select(this.alternateSex);
      }

      return pdfDoc;
    }

    initializeNewPage(page, clientName) {
      page.drawText(`Client: ${clientName}`, {
        x: 50,
        y: page.getHeight() - 50,
        size: 12,
      });

      const formattedDate = new Date().toLocaleString("en-US", {
        timeZone: "HST",
      });
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

    addCaseToPage(page, caseObj, yPosition) {
      page.drawText(
        `Case Number: ${caseObj.CaseNumber}: ${caseObj.Expungeable}`,
        {
          x: 50,
          y: yPosition,
          size: 10,
        }
      );
      return yPosition - 20;
    }

    async generateExpungementLetterDOCX(caseObj, client, letterName) {
      const templateUrl = chrome.runtime.getURL(
        "expungement_letter_template.docx"
      );
      const templateResponse = await fetch(templateUrl);
      const templateArrayBuffer = await templateResponse.arrayBuffer();

      const courtLocation = caseObj.CourtLocation;
      const courtAddresses = await window.DataLoaders.loadCourtAddresses();
      const caseNumber = caseObj.CaseNumber;
      const allSearchReplaceTables =
        await window.DataLoaders.loadSearchReplaceTables();
      const searchReplaceTable = allSearchReplaceTables.expungement;

      const courtInfo = this.findCourtAddress(courtAddresses, courtLocation);
      console.log(
        `Generating letter for case ${caseNumber} at ${courtLocation}`
      );

      let courtName = "";
      let courtAddress1 = "";
      let courtAddress2 = "";
      let courtAddress3 = "";

      if (courtInfo) {
        courtName = courtInfo.name;
        [courtAddress1, courtAddress2, courtAddress3 = ""] = courtInfo.address;
      }

      const letterDate = new Date().toLocaleDateString("en-US", {
        timeZone: "HST",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const zip = await JSZip.loadAsync(templateArrayBuffer);
      let documentXmlContent = await zip
        .file("word/document.xml")
        .async("string");

      documentXmlContent = this.handleOptionalParagraphs(documentXmlContent);

      const placeholderToValue = {
        κ: letterName,
        δ: letterDate,
        τ: caseNumber,
        μ: this.alternateAddressLine1,
        ν: this.alternateAddressLine2,
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

      zip.file("word/document.xml", documentXmlContent);
      await this.generateAndDownloadDOCX(zip, client, caseNumber);
    }

    findCourtAddress(courtAddresses, location) {
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

    handleOptionalParagraphs(content) {
      if (this.alternateAddressLine3) {
        content = content.replace("ξ", this.alternateAddressLine3);
      } else {
        content = content.replace(
          /<w:p w14:paraId="20DEE2BC".*?ξ<\/w:t><\/w:r><\/w:p>/,
          ""
        );
      }

      if (this.alternatePhone) {
        content = content.replace("φ", this.alternatePhone);
      } else {
        content = content.replace(
          /<w:p w14:paraId="32400D1D".*?φ<\/w:t><\/w:r><\/w:p>/,
          ""
        );
      }

      if (this.alternateEmail) {
        content = content.replace("ω", this.alternateEmail);
      } else {
        content = content.replace(
          /<w:p w14:paraId="011CD49E".*?ω<\/w:t><\/w:r><\/w:p>/,
          ""
        );
      }

      return content;
    }

    async generateAndDownloadDOCX(zip, client, caseNumber) {
      try {
        const zipContent = await zip.generateAsync({ type: "blob" });
        const docxDownloadLink = document.createElement("a");
        docxDownloadLink.href = URL.createObjectURL(zipContent);
        docxDownloadLink.download = `${
          client["Last Name"] || "name_unavailable"
        }_letter_${caseNumber}.docx`;
        document.body.appendChild(docxDownloadLink);
        docxDownloadLink.click();
        document.body.removeChild(docxDownloadLink);
      } catch (error) {
        console.error("Error generating DOCX file:", error);
      }
    }

    async downloadPDF(pdfDoc, client) {
      try {
        const modifiedPdfBytes = await pdfDoc.save();
        const blob = new Blob([modifiedPdfBytes], { type: "application/pdf" });
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `${
          client["Last Name"] || "name_unavailable"
        }_form_and_summary.pdf`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } catch (error) {
        console.error("Error in downloadPDF:", error);
      }
    }

    ////////////////////////// Generate Warrant Documents //////////////////////////
    async generateAllWarrantDocuments() {
      const cases = await this.getCases();

      for (const caseObj of cases) {
        if (this.shouldGenerateWarrantPaperwork(caseObj)) {
          await this.generateWarrantDocuments(caseObj);
        }
      }
    }

    async generateWarrantDocuments(caseObj) {
      // Load attorney and warrant information
      await this.loadAttorneyInfo();
      const warrantDetails = await this.loadWarrantDetails(caseObj.CaseNumber);

      // Select template based on attorney type
      const template = this.selectWarrantTemplate();

      // Load template
      const templateUrl = chrome.runtime.getURL(template.filename);
      const templateResponse = await fetch(templateUrl);
      const templateArrayBuffer = await templateResponse.arrayBuffer();

      // Process document with JSZip (similar to expungement letter)
      const zip = await JSZip.loadAsync(templateArrayBuffer);
      let documentXmlContent = await zip
        .file("word/document.xml")
        .async("string");

      // Prepare replacement data
      const replacementData = await this.prepareWarrantReplacementData(
        caseObj,
        warrantDetails
      );

      // Apply replacements
      documentXmlContent = this.applyWarrantReplacements(
        documentXmlContent,
        replacementData,
        template.mapping
      );

      // Save and download
      zip.file("word/document.xml", documentXmlContent);
      await this.generateAndDownloadWarrantDOCX(zip, caseObj);
    }

    async prepareWarrantReplacementData(caseObj, warrantDetails) {
      // Helper function to split date into components
      const getDateComponents = (dateString) => {
        if (!dateString) return { month: "", day: "", year: "" };
        const date = new Date(dateString);
        return {
          month: date.toLocaleString("en-US", { month: "long" }),
          day: date.getDate().toString(),
          year: date.getFullYear().toString(),
        };
      };

      // Get date components for all relevant dates
      const warrantIssueDates = getDateComponents(
        warrantDetails.warrantIssueDate
      );
      const nonAppearanceDates = getDateComponents(
        warrantDetails.nonAppearanceDate
      );
      const consultationDates = getDateComponents(
        warrantDetails.consultationDate
      );

      // Format warrant amount (remove any non-numeric characters except decimal point)
      let formattedWarrantAmount = warrantDetails.warrantAmount
        ? warrantDetails.warrantAmount.replace(/[^\d.]/g, "")
        : "";
      // Add commas to separate thousands (accounting for any decimal point)
      const decimalIndex = formattedWarrantAmount.indexOf(".");
      if (decimalIndex > -1) {
        formattedWarrantAmount =
          formattedWarrantAmount
            .slice(0, decimalIndex)
            .replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
          formattedWarrantAmount.slice(decimalIndex);
      } else {
        formattedWarrantAmount = formattedWarrantAmount.replace(
          /\B(?=(\d{3})+(?!\d))/g,
          ","
        );
      }

      // Combine all data sources into a single object
      const replacementData = {
        // Attorney Information
        attorneyName: this.attorneyInfo.attorneyName || "",
        attorneyRegistration: this.attorneyInfo.attorneyRegistration || "",
        attorneySignatureLocation:
          this.attorneyInfo.attorneySignatureLocation || "",

        // Public Defender specific fields
        headPdName: this.attorneyInfo.headPdName || "",
        headPdRegistration: this.attorneyInfo.headPdRegistration || "",

        // Private Attorney specific fields
        firmName: this.attorneyInfo.firmName || "",
        attorneyAddress1: this.attorneyInfo.attorneyAddress1 || "",
        attorneyAddress2: this.attorneyInfo.attorneyAddress2 || "",
        attorneyAddress3: this.attorneyInfo.attorneyAddress3 || "",
        attorneyAddress4: this.attorneyInfo.attorneyAddress4 || "",
        attorneyTelephone: this.attorneyInfo.attorneyTelephone || "",
        attorneyFax: this.attorneyInfo.attorneyFax || "",
        attorneyEmail: this.attorneyInfo.attorneyEmail || "",

        // Case Information
        caseNumber: caseObj.CaseNumber || "",
        defendantNameFull: caseObj.DefendantName || "",
        circuitOrdinal: caseObj.courtCircuit || "",

        // Warrant Information
        warrantIssueMonth: warrantIssueDates.month,
        //warrantIssueMonth: new Date(warrantDetails.warrantIssueDate).toLocaleString('en-US', { month: 'long' }),
        warrantIssueDay: warrantIssueDates.day,
        warrantIssueYear: warrantIssueDates.year,
        warrantAmount: formattedWarrantAmount,

        // Non-appearance Information
        nonAppearanceMonth: nonAppearanceDates.month,
        nonAppearanceDay: nonAppearanceDates.day,
        nonAppearanceYear: nonAppearanceDates.year,

        // Consultation Information
        consultationMonth: consultationDates.month,
        consultationDay: consultationDates.day,
        consultationYear: consultationDates.year,
        consultationTown: warrantDetails.consultationTown || "",
        consultVerbPhrase: warrantDetails.consultVerbPhrase || "",
      };

      // Log prepared data for debugging
      console.log("Prepared warrant replacement data:", replacementData);

      return replacementData;
    }

    applyWarrantReplacements(
      documentXmlContent,
      replacementData,
      templateMapping
    ) {
      // Log initial state for debugging
      console.log(
        "Applying warrant replacements with mapping:",
        templateMapping
      );

      // Iterate through the template mapping
      for (const [placeholder, dataKey] of Object.entries(templateMapping)) {
        const replacementValue = replacementData[dataKey] || "";

        // Create a RegExp for global replacement
        const placeholderRegex = new RegExp(placeholder, "g");

        // Log each replacement for debugging
        console.log(
          `Replacing ${placeholder} with "${replacementValue}" for key ${dataKey}`
        );

        // Perform the replacement
        documentXmlContent = documentXmlContent.replace(
          placeholderRegex,
          replacementValue
        );
      }

      // Verify no placeholders remain (debugging)
      const remainingGreekLetters = documentXmlContent.match(/[α-ωΑ-Ω]/g);
      if (remainingGreekLetters) {
        console.warn(
          "Warning: Unreplaced Greek letters found:",
          [...new Set(remainingGreekLetters)].join(", ")
        );
      }

      return documentXmlContent;
    }

    async generateAndDownloadWarrantDOCX(zip, caseObj) {
      try {
        // Generate the zip content
        const zipContent = await zip.generateAsync({ type: "blob" });

        // Create filename based on case info
        const filename = this.generateWarrantFilename(caseObj);

        // Create download link
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(zipContent);
        downloadLink.download = filename;

        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Log success
        console.log(
          `Warrant paperwork generated for case ${caseObj.CaseNumber}`
        );
      } catch (error) {
        console.error("Error generating warrant DOCX file:", error);
        throw new Error(
          `Failed to generate warrant paperwork for case ${caseObj.CaseNumber}: ${error.message}`
        );
      }
    }

    generateWarrantFilename(caseObj) {
      const safeName = (caseObj.DefendantName || "unknown_defendant")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toLowerCase();

      return `${safeName}_warrant_${caseObj.CaseNumber}.docx`;
    }
  }
  return DocumentGenerator;
})();

// Make DocumentGenerator available globally
window.DocumentGenerator = DocumentGenerator;
