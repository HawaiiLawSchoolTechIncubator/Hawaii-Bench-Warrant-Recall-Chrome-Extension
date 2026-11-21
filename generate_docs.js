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
      const defaultDataUrl = chrome.runtime.getURL("settings.json");
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
          Ϝ: "courtCircuit",
          "{{year}}": `literal: ${new Date().getFullYear().toString()}`,
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
          Ϝ: "courtCircuit",
          "{{year}}": new Date().getFullYear().toString(),
        },
      },
    };

    ////////////////////////// Optional Paragraph Patterns //////////////////////////
    static OPTIONAL_PARAGRAPH_PATTERNS = {
      expungement: {
        dddressLine3: {
          placeholder: "ξ",
          pattern: /<w:p w14:paraId="20DEE2BC".*?ξ<\/w:t><\/w:r><\/w:p>/,
          emptyReplacement: "", // Removing entire paragraph when empty
        },
        phone: {
          placeholder: "φ",
          pattern: /<w:p w14:paraId="32400D1D".*?φ<\/w:t><\/w:r><\/w:p>/,
          emptyReplacement: "",
        },
        email: {
          placeholder: "ω",
          pattern: /<w:p w14:paraId="011CD49E".*?ω<\/w:t><\/w:r><\/w:p>/,
          emptyReplacement: "",
        },
      },
      warrant: {
        privateAttorney: {
          firmName: {
            placeholder: "φ",
            pattern: /<w:r.*?φ<\/w:t>.*?><w:br\/><\/w:r>/,
            emptyReplacement: "", // Currently just empty string
          },
          attorneyAddress3: {
            placeholder: "δ",
            pattern: /<w:p w14:paraId="5BB03E26".*δ<\/w:t><\/w:r><\/w:p>/,
            emptyReplacement: "",
          },
          attorneyAddress4: {
            placeholder: "ε",
            pattern: /<w:p w14:paraId="463A85AE".*ε<\/w:t><\/w:r><\/w:p>/,
            emptyReplacement: "",
          },
          attorneyFax: {
            placeholder: "η",
            pattern: /<w:p w14:paraId="23E48E27".*η<\/w:t><\/w:r><\/w:p>/,
            emptyReplacement: "",
          },
          attorneyEmail: {
            placeholder: "θ",
            pattern: /<w:p w14:paraId="6C48E1FB".*θ<\/w:t><\/w:r><\/w:p>/,
            emptyReplacement: "",
          },
          attorneySignatureLocation: {
            // Special: alters two adjacent runs; does not remove a paragraph
            placeholder: "χ",
            pattern: /<w:r w:rsidR="007A17FE".*?χ.*?<w:t>, /,
            emptyReplacement: "<w:r><w:t>",
          },
        },
        publicDefender: {
          attorneySignatureLocation: {
            // Special: alters two adjacent runs; does not remove a paragraph
            placeholder: "χ",
            pattern: /<w:r w:rsidR="001D517E".*?χ.*?>, /,
            emptyReplacement: '<w:r><w:t xml:space="preserve">',
          },
        },
      },
    };

    ////////////////////////// Load Attorney Info //////////////////////////
    async loadAttorneyInfo() {
        // First load the default data
        const defaultDataUrl = chrome.runtime.getURL('settings.json');
        const defaultResponse = await fetch(defaultDataUrl);
        const defaultData = await defaultResponse.json();

      return new Promise((resolve) => {
        chrome.storage.local.get("attorneyInfo", (result) => {
          // Set default values for required fields
          this.attorneyInfo = {
            isPublicDefender: true, // Default value
            firmName: "",
            attorneyName: "",
            attorneyRegistration: "",
            attorneySignatureLocation: "",
            //headPdName: "Jon N. Ikenaga",
            //headPdRegistration: "6284",
            headPdName: defaultData.head_public_defender_name,
            headPdRegistration: defaultData.head_public_defender_registration,
            attorneyAddress1: "",
            attorneyAddress2: "",
            attorneyAddress3: "",
            attorneyAddress4: "",
            attorneyTelephone: "",
            attorneyFax: "",
            attorneyEmail: "",
            courtCircuit: "",
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
          console.log("Mapped alternate info:", this.alternateInfo);
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

    normalizeDefendantName(name, format = "last, first middle") {
      let lastName, firstName, middleName;
      let returnName = "";
      // Use alternate names if any exist
      if (
        this.alternateInfo.firstName ||
        this.alternateInfo.middleName ||
        this.alternateInfo.lastName
      ) {
        firstName = this.alternateInfo.firstName;
        middleName = this.alternateInfo.middleName;
        lastName = this.alternateInfo.lastName;
      } else {
        // Original name analysis
        const nameParts = name.trim().split(/\s+/);
        
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
      }

      if (format === "last, first middle") {
        returnName = `${lastName}, ${firstName} ${middleName}`.trim();
      } else if (format === "first, middle, last") {
        returnName = `${firstName}, ${middleName}, ${lastName}`.trim();
      } else if (format === "first middle last") {
        returnName = `${firstName} ${middleName} ${lastName}`.trim();
      } else if (format === "first last") {
        returnName = `${firstName} ${lastName}`.trim();
      } else if (format === "last") {
        returnName = `${lastName}`.trim();
      } else if (format === "first") {
        returnName = `${firstName}`.trim();
      } else if (format === "middle") {
        returnName = `${middleName}`.trim();
      } else {
        returnName = name;
      }
      returnName = returnName.replace(/\s,/g, '');
      returnName = returnName.replace(/\s{2,}/g, ' ');
      return returnName;
      //return `${lastName}, ${firstName} ${middleName}`.trim();
    }

    createClientObject(normalizedName) {
      const [lastName, firstMiddle] = normalizedName.split(", ");
      const [firstName, ...middleParts] = (firstMiddle || "").split(" ");
      const middleName = middleParts.join(" ");

      let letterName = `${firstName} ${middleName} ${lastName}`.trim();
      letterName = letterName.replace(/\s{2,}/g, ' ');

      return {
        "Last Name": lastName,
        "First Name": firstName,
        "Middle Name": middleName,
        "PDF Name": normalizedName,
        "Letter Name": letterName,
      };
    }

    /**
     * Handles optional paragraphs in document XML based on document type and data
     * @param {string} content - The XML content of the document
     * @param {string} templateType - The type of template ('expungement' or 'warrant')
     * @returns {string} Modified XML content with appropriate replacements
     */
    handleOptionalParagraphs(content, templateType) {
      if (templateType === "expungement") {
        const patterns = DocumentGenerator.OPTIONAL_PARAGRAPH_PATTERNS.expungement;
    
        for (const [key, pattern] of Object.entries(patterns)) {
          const value = this.alternateInfo[key];  // Access through alternateInfo
          if (value) {
            content = content.replace(pattern.placeholder, value);
          } else {
            content = content.replace(pattern.pattern, pattern.emptyReplacement);
          }
        }
      } else if (templateType === "warrant") {
        if (this.attorneyInfo.isPublicDefender) {
          // Public Defender specific optional paragraphs
          const patterns =
            DocumentGenerator.OPTIONAL_PARAGRAPH_PATTERNS.warrant
              .publicDefender;

          for (const [key, pattern] of Object.entries(patterns)) {
            const value = this.attorneyInfo[key];
            if (value) {
              content = content.replace(pattern.placeholder, value);
            } else {
              content = content.replace(
                pattern.pattern,
                pattern.emptyReplacement
              );
            }
          }
          return content;
        } else {
          // Private attorney specific optional paragraphs
          const patterns =
            DocumentGenerator.OPTIONAL_PARAGRAPH_PATTERNS.warrant
              .privateAttorney;

          for (const [key, pattern] of Object.entries(patterns)) {
            const value = this.attorneyInfo[key];
            if (value) {
              content = content.replace(pattern.placeholder, value);
            } else {
              content = content.replace(
                pattern.pattern,
                pattern.emptyReplacement
              );
            }
          }
        }
      }

      return content;
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

      // Summary pages. NB: pdf-lib's standard fonts are WinAnsi-encoded, so
      // keep this text to ASCII plus "§" (no ʻokina, curly quotes, etc.).
      const font = await pdfDoc.embedFont(window.PDFLib.StandardFonts.Helvetica);
      const summary = { pdfDoc, font, clientName: client["PDF Name"] };
      summary.page = pdfDoc.addPage([600, 400]);
      summary.y = this.initializeNewPage(summary.page, client["PDF Name"]);

      let hasExpungeableCase = false;

      for (const caseObj of clientCaseList) {
        this.drawSummaryText(
          summary,
          `Case Number: ${caseObj.CaseNumber}: ${caseObj.Expungeable}`,
          { size: 10 }
        );
        for (const note of this.getCaseSummaryNotes(caseObj)) {
          this.drawSummaryText(summary, note, { size: 8, indent: 15 });
        }
        summary.y -= 6;

        if (this.isExpungeableEnoughForPaperwork(caseObj)) {
          hasExpungeableCase = true;
        }
      }

      summary.y -= 8;
      this.drawSummaryText(summary, "Notes", { size: 10 });
      for (const note of DocumentGenerator.EXPUNGEMENT_SUMMARY_NOTES) {
        this.drawSummaryText(summary, `- ${note}`, { size: 8, indent: 10 });
      }

      if (hasExpungeableCase) {
        await this.downloadPDF(pdfDoc, client);
      }
    }

    // General notes printed at the end of the case summary.
    static EXPUNGEMENT_SUMMARY_NOTES = [
      "Sealing of court records: when the AG's expungement order lists the court case number and is transmitted to the Judiciary, the court seals the case on its own (HRS § 831-3.2(f), effective July 1, 2025). A separate letter to the court is no longer needed.",
      "The court is not required to seal a case if (1) any charge in the case is not covered by the expungement order, or (2) a co-defendant in the case has not also been expunged (HRS § 831-3.2(f)(1)-(2)). Such cases may remain visible in eCourt Kokua.",
      "Violation convictions: a person arrested for or charged with a crime but convicted only of a violation may expunge the arrest record (HRS § 831-3.2(a) as amended by Act 152 (2026), codifying Barker v. Young, 153 Haw. 144 (2023)). The AG form's checkbox language refers to offenses with no conviction; consider attaching a short statement citing Act 152 for these cases.",
      "Application checklist (HCJDC 159(b) Rev. 06/03/2026): signature; copy of valid government-issued photo ID (required); mailing address; self-addressed stamped envelope; money order or cashier's check issued in the U.S., payable to \"State of Hawaii\" ($35 first-time, $50 non-first-time).",
    ];

    // Per-case notes for the summary page.
    getCaseSummaryNotes(caseObj) {
      const notes = [];
      const charges = Array.isArray(caseObj?.charges) ? caseObj.charges : [];

      const violationConvictionCounts = charges
        .filter((c) => c?.isExpungeable?.violationConvictionEligible)
        .map((c) => c.count)
        .filter((n) => n !== undefined && n !== null && n !== "");
      if (violationConvictionCounts.length > 0) {
        notes.push(
          `Count(s) ${violationConvictionCounts.join(", ")}: violation conviction; eligible under Act 152 (2026) / Barker v. Young if the person was arrested for or charged with a crime (see case details).`
        );
      }

      const hasIneligibleCharge = charges.some(
        (c) => c?.isExpungeable?.status === "Not Expungeable"
      );
      if (hasIneligibleCharge && charges.length > 1) {
        notes.push(
          "Not every charge is eligible: the court is not required to seal this case (HRS § 831-3.2(f)(1))."
        );
      }
      return notes;
    }

    // Draw word-wrapped text on the summary pages, adding pages as needed.
    drawSummaryText(summary, text, { size = 10, indent = 0 } = {}) {
      const left = 50 + indent;
      const maxWidth = 600 - left - 40;
      const lineHeight = size + 4;
      const safeText = String(text).replace(/[^\x20-\x7E§]/g, " ");

      const lines = [];
      let line = "";
      for (const word of safeText.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && summary.font.widthOfTextAtSize(candidate, size) > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) lines.push(line);

      for (const l of lines) {
        if (summary.y < 40) {
          summary.page = summary.pdfDoc.addPage([600, 400]);
          summary.y = this.initializeNewPage(summary.page, summary.clientName);
        }
        summary.page.drawText(l, { x: left, y: summary.y, size, font: summary.font });
        summary.y -= lineHeight;
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
        this.alternateInfo.addressLine1,
        this.alternateInfo.addressLine2,
        this.alternateInfo.addressLine3
      ]
        .filter(Boolean)
        .join(", ");
    
      clientNameField.setText(client["PDF Name"]);
      clientHomeAddressField.setText(clientAddressOneLine);
      clientMailingAddressField.setText(clientAddressOneLine);
      clientPhoneField.setText(this.alternateInfo.phone);
      clientEmailField.setText(this.alternateInfo.email);
      clientDOBField.setText(this.alternateInfo.dob);
      signingDateField.setText(
        new Date().toLocaleDateString("en-US", {
          timeZone: "HST",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );

      // Give every text field an explicit font size that fits with margin.
      // Left to auto-size, pdf-lib shrinks text until it *just* fits (e.g. the
      // ~99pt date box gets "November 20, 2026" at 11pt), but Acrobat lays text
      // out with ~2pt padding per side and then won't display a value that
      // overflows until the field is clicked.
      const helvetica = await pdfDoc.embedFont(window.PDFLib.StandardFonts.Helvetica);
      [
        clientNameField,
        clientHomeAddressField,
        clientMailingAddressField,
        clientPhoneField,
        clientEmailField,
        clientDOBField,
        signingDateField,
      ].forEach((field) => {
        try {
          this.setFittingFontSize(field, helvetica);
        } catch (error) {
          console.error(`Could not set font size for ${field.getName()}:`, error);
        }
      });

      if (this.alternateInfo.sex) {
        sexField.select(this.alternateInfo.sex);
      }
    
      return pdfDoc;
    }

    // Largest font size (max 12pt, min 6pt) at which the field's text fits
    // inside its widget with padding to spare.
    setFittingFontSize(field, font, maxSize = 12, minSize = 6) {
      const text = field.getText() || "";
      const widget = field.acroField.getWidgets()[0];
      const width = widget ? widget.getRectangle().width : 0;
      const available = width - 8; // ~2pt Acrobat padding per side + margin
      let size = maxSize;
      while (size > minSize && text && font.widthOfTextAtSize(text, size) > available) {
        size -= 0.5;
      }
      field.setFontSize(size);
    }

    // async initializeNewPDF(pdfBytes, client) {
    //   const pdfDoc = await window.PDFLib.PDFDocument.load(pdfBytes);
    //   const form = pdfDoc.getForm();

    //   const clientNameField = form.getTextField("Client_Name");
    //   const clientHomeAddressField = form.getTextField("Home_Address");
    //   const clientMailingAddressField = form.getTextField("Mailing_Address");
    //   const clientPhoneField = form.getTextField("Phone_Number");
    //   const clientEmailField = form.getTextField("Email");
    //   const clientDOBField = form.getTextField("Date of Birth");
    //   const signingDateField = form.getTextField("Signing_Date");
    //   const sexField = form.getRadioGroup("Sex");

    //   const clientAddressOneLine = [
    //     this.alternateAddressLine1,
    //     this.alternateAddressLine2,
    //     this.alternateAddressLine3,
    //   ]
    //     .filter(Boolean)
    //     .join(", ");

    //   clientNameField.setText(client["PDF Name"]);
    //   clientHomeAddressField.setText(clientAddressOneLine);
    //   clientMailingAddressField.setText(clientAddressOneLine);
    //   clientPhoneField.setText(this.alternatePhone);
    //   clientEmailField.setText(this.alternateEmail);
    //   clientDOBField.setText(this.alternateDOB);
    //   signingDateField.setText(
    //     new Date().toLocaleDateString("en-US", {
    //       timeZone: "HST",
    //       year: "numeric",
    //       month: "long",
    //       day: "numeric",
    //     })
    //   );

    //   if (this.alternateSex) {
    //     sexField.select(this.alternateSex);
    //   }

    //   return pdfDoc;
    // }

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
        
        // Append timezone if missing to ensure date is parsed as local time and not UTC and then converted
        if (!dateString.includes('T')) {
            dateString = dateString + 'T00:00:00';
        }
        
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
      console.log("Attorney Info:", this.attorneyInfo);
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
        //defendantNameFull: caseObj.DefendantName || "",
        defendantNameFull: this.normalizeDefendantName(caseObj.DefendantName, "first middle last") || "",
        courtCircuit: caseObj.courtCircuit || "",

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
      
      // Literal values will be handled when replacements are performed

      // Log prepared data for debugging
      console.log("Prepared warrant replacement data:", replacementData);

      return replacementData;
    }

    applyWarrantReplacements(
      documentXmlContent,
      replacementData,
      templateMapping
    ) {
      // 
      console.log("Applying warrant replacements to document XML content");
      console.log("Replacement data:", replacementData);

      // First handle optional paragraphs based on attorney type
      documentXmlContent = this.handleOptionalParagraphs(
        documentXmlContent,
        "warrant"
      );

      // Then handle all regular replacements using the template mapping
      for (let [placeholder, dataKey] of Object.entries(templateMapping)) {
        let replacementValue
        // Remove "literal: " from dataKey starting with "literal: ..."
        // and set replacementValue to the part of the string removed
        if (dataKey.startsWith("literal: ")) {
          replacementValue = dataKey.slice(8);
        } else {
          replacementValue = replacementData[dataKey] || '';
        }
        
        console.log(`Replacing ${placeholder} with ${dataKey}`);

        
        //const replacementValue = replacementData[dataKey] || "";
        const placeholderRegex = new RegExp(placeholder, "g");
        documentXmlContent = documentXmlContent.replace(
          placeholderRegex,
          replacementValue
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
      const safeName = (this.normalizeDefendantName(caseObj.DefendantName, "last") || "unknown_defendant")
        .replace(/\.[a-zA-Z]/g, "").replace(/[^a-zA-Z0-9, ]/g, "_")
        //.toLowerCase();

      return `${safeName}_warrant_${caseObj.CaseNumber}.docx`;
    }
  }
  return DocumentGenerator;
})();

// Make DocumentGenerator available globally
window.DocumentGenerator = DocumentGenerator;
