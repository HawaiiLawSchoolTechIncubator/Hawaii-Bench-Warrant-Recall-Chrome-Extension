console.log("unified_cases.js loaded");
console.log("jQuery version:", $.fn.jquery);
console.log("Bootstrap loaded:", typeof bootstrap !== "undefined");
console.log("Bootstrap version:", bootstrap?.Tooltip?.VERSION);

// Utility functions
const utils = {
  formatName(name) {
    // Format a name string to capitalize the first letter of each word,
    // with special handling for Mc/Mac prefixes and single-letter names.

    // Add a period after any single-letter name part not already ending in a period
    name = name.replace(/\b([A-Za-z])\b(?!\.)/g, "$1.");
    name = name.replace(/,? et al\.?/i, "");

    // Defer to capitalization if first character is uppercase and second is lowercase
    if (/^[A-Z][a-z]/.test(name)) {
      return name;
    }

    // Helper function to capitalize a single word
    const capitalizeWord = (word) => {
      if (word.length === 0) return "";
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    };

    // Helper function to handle Mc/Mac prefixes
    const handleMcMac = (word) => {
      if (word.length <= 2) return capitalizeWord(word);
      const lowerWord = word.toLowerCase();
      if (lowerWord.startsWith("mc") && word.length > 2) {
        return "Mc" + word[2].toUpperCase() + word.slice(3).toLowerCase();
      }
      if (lowerWord.startsWith("mac") && word.length > 3) {
        return "Mac" + word[3].toUpperCase() + word.slice(4).toLowerCase();
      }
      return capitalizeWord(word);
    };

    // Remove a trailing "Etc" or "Etc." from the name
    name = name.replace(/\s+etc\.?$/i, "");

    // Split the name into parts (by space and hyphen)
    const parts = name.split(/[\s-]+/);

    // Process each part
    const processedParts = parts.map((part) => {
      // Split by apostrophe and process each subpart
      const subParts = part.split("'");
      const processedSubParts = subParts.map(handleMcMac);
      return processedSubParts.join("'");
    });

    // Join the processed parts, preserving original separators
    let result = "";
    let partIndex = 0;
    for (let i = 0; i < name.length; i++) {
      if (name[i] === " " || name[i] === "-") {
        result += name[i];
      } else if (partIndex < processedParts.length) {
        result += processedParts[partIndex];
        partIndex++;
        // Skip to the end of this part in the original name
        while (i < name.length && name[i] !== " " && name[i] !== "-") {
          i++;
        }
        i--; // Adjust for the loop's increment
      }
    }

    return result;
  },
  extractCaseInfo: function () {
    /**
     * Extracts case information from the provided HTML document.
     *
     * @returns {Object} An object containing the extracted case information.
     * @property {string} caseId - The ID of the case.
     * @property {string} caseName - The name of the case.
     * @property {string} courtLocation - The location of the court.
     * @property {string} courtCircuit - The case's Hawaii circuit.
     * @property {string} filingDate - The filing date of the case.
     * @property {string} defendantName - The name of the defendant.
     */

    // Extract the case ID and the defendant's name
    const caseInfoElement = $(
      ".iceDatTbl,.data:first > tbody > tr > td"
    ).first();
    const caseInfo = caseInfoElement.text();
    const caseId = caseInfo.slice(9, 24).trim().split(" ")[0];
    const caseName = caseInfo.slice(27, caseInfo.indexOf("Type:"));

    let defendantName = null;
    console.log(`caseInfo: '${caseInfo}'`);
    let match = caseInfo.match(
      /Case ID:\s+(.*?)\s+-\s+State (of Hawaii )?vs?\.?\s+(.*)/i
    );
    let secondary_match = caseInfo.match(/ vs?\.?\s+(.*)/i);
    if (match && match[3]) {
      defendantName = match[3].trim().split("Type:")[0];
    } else if (secondary_match && secondary_match[1]) {
      defendantName = secondary_match[1].trim().split("Type:")[0];
    } else {
      console.log("Defendant Name not found");
    }
    console.log(`Defendant Name as found: '${defendantName}'`);
    if (defendantName) {
      defendantName = defendantName.split(" -NON JURY-")[0];
      defendantName = defendantName.split(" -JURY-")[0];
      defendantName = utils.formatName(defendantName);
      console.log(`Defendant Name formatted: '${defendantName}'`);
    }

    // Extract the court location and filing date
    const locationElement = document.querySelector(
      ".iceDatTbl.data > tbody > tr > td:nth-child(2)"
    );
    if (!locationElement) {
      console.log("locationElement not found");
      return;
    }
    console.log("locationElement:", locationElement);

    const locationText = locationElement.innerHTML;
    const locationMatch = locationText.match(/<b>Location: <\/b>([^<]*)/);
    const courtLocation = locationMatch
      ? locationMatch[1].trim()
      : "Location not found";
    console.log("courtLocation:", courtLocation);

    const filingDateMatch = locationText.match(/<b>Filing Date: <\/b>([^<]*)/);
    const filingDate = filingDateMatch
      ? filingDateMatch[1].trim()
      : "Filing Date not found";
    console.log("filingDate:", filingDate);

    // Extract the court circuit (the first character of the case ID if a digit)
    // and convert to ordinal number (e.g., "1" to "First")
    const digitToOrdinal = {
      "1": "first",
      "2": "second",
      "3": "third",
      "4": "fourth", // Not used in Hawaii
      "5": "fifth",
    };
    const courtCircuit = digitToOrdinal[caseId[0]] || "Unknown";

    return { caseId, caseName, courtLocation, courtCircuit, filingDate, defendantName };
  },
  // Function to create and show the dialog
  showDialog(title, message) {
    /**
     * Displays a dialog box with the specified title and message.
     *
     * @param {string} title - The title of the dialog.
     * @param {string} message - The message to be displayed in the dialog.
     * @returns {void}
     */
    console.log("showDialog function called with:", { title, message });

    // Create dialog elements
    const dialog = document.createElement("div");
    dialog.className = "dialog-overlay";

    const dialogContent = document.createElement("div");
    dialogContent.className = "dialog-content";

    const dialogTitle = document.createElement("h2");
    dialogTitle.textContent = title;

    const dialogMessage = document.createElement("p");
    dialogMessage.textContent = message;

    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.onclick = () => {
      document.body.removeChild(dialog);
    };

    // Assemble dialog
    dialogContent.appendChild(dialogTitle);
    dialogContent.appendChild(dialogMessage);
    dialogContent.appendChild(closeButton);
    dialog.appendChild(dialogContent);

    // Add dialog to body
    document.body.appendChild(dialog);

    // Force a reflow to ensure the dialog is rendered
    void dialog.offsetWidth;

    // Add a class to trigger any CSS transitions
    dialog.classList.add("visible");
  },
  normalizeSeverity(chargeObject, caseType = "") {
    // Return a normalized severity string based on the charge object and case type.

    let severity = chargeObject?.severity;
    if (severity) {
      severity = severity.toLowerCase();
    } else {
      severity = "";
    }
    const charge = chargeObject.charge.toLowerCase();
    const statute = chargeObject.statute;

    let normalizedSeverity = severity;
    if (
      severity.includes("§701-108(1) felony") ||
      chargeObject.charge.toLowerCase().includes("murder")
    ) {
      normalizedSeverity = "§701-108(1) Felony";
    } else if (
      charge.toLowerCase().includes("sexual assault1") ||
      charge.toLowerCase().includes("sexual assault2")
    ) {
      normalizedSeverity = "§701-108(1) Felony";
    } else if (statute.includes("707-733.6")) {
      normalizedSeverity = "§707-733.6 Felony";
    } else if (
      (charge.includes("manslaughter") || severity === "§701-108(2) felony") &&
      !charge.toLowerCase().includes("vehic")
    ) {
      normalizedSeverity = "§701-108(2) Felony";
    } else if (
      severity.includes("pm") ||
      severity.includes("petty misdemeanor")
    ) {
      normalizedSeverity = "Petty Misdemeanor";
    } else if (severity.includes("md") || severity.includes("misdemeanor")) {
      normalizedSeverity = "Misdemeanor";
    } else if (
      ["fa -", "class a", "felony a"].some((s) => severity.includes(s)) ||
      severity === "fa"
    ) {
      normalizedSeverity = "Felony A";
    } else if (
      ["fb -", "class b", "felony b"].some((s) => severity.includes(s)) ||
      severity === "fb"
    ) {
      normalizedSeverity = "Felony B";
    } else if (
      ["fc -", "class c", "felony c"].some((s) => severity.includes(s)) ||
      severity === "fc"
    ) {
      normalizedSeverity = "Felony C";
    } else if (caseType) {
      if (caseType == "DTI") {
        normalizedSeverity = "violation";
      } else if (caseType == "DTA" || caseType == "DTC") {
        normalizedSeverity = "misdemeanor";
      } else {
        normalizedSeverity = "unknown";
      }
    } else {
      normalizedSeverity = "unknown";
    }

    if (normalizedSeverity.includes("felony") && statute.includes("HRS 708")) {
      normalizedSeverity = "§708 fraud felony";
    }
    return normalizedSeverity;
  },
  createTooltipCell(text, bgColor, explanation, additionalAttributes = "") {
    // Create a table cell with tooltip attributes for displaying expungeability information.
    return `<td align="LEFT" style="vertical-align: top; background-color: ${bgColor};" data-expungeability ${additionalAttributes} data-bs-toggle="tooltip" data-bs-placement="top" title="${explanation}">${text}</td>`;
  },
};

// Legal Logic
class ExpungeabilityEvaluator {
  /**
   * Class representing an Expungeability Evaluator.
   * This class provides methods to evaluate the expungeability of a charge based on its dispositions and additional factors.
   */
  static DISPOSITION_RULES = {
    // NB: A disposition rule will be applied if the disposition string contains the key as a substring.
    // Order of rules is important, as the first matching rule will be applied.
    "Not Guilty": (charge, additionalFactors) => ({
      status: "Expungeable",
      explanation: "Defendant found not guilty.",
      finalJudgment: true,
    }),

    "Dismissed With Prejudice": (charge, additionalFactors) => ({
      status: "Expungeable",
      explanation: "Charge dismissed with prejudice.",
      finalJudgment: true,
    }),

    "Dsm With Prejudice": (charge, additionalFactors) => ({
      status: "Expungeable",
      explanation: "Charge dismissed with prejudice.",
      finalJudgment: true,
    }),

    "Dsm With Prejudice Rule 48": (charge, additionalFactors) => ({
      status: "Expungeable",
      explanation: "Charge dismissed with prejudice under Rule 48.",
      finalJudgment: true,
    }),

    "Defer-Accept Guilty Plea": (charge, additionalFactors) => ({
      status: "Deferred",
      explanation:
        "Deferred acceptance disposition normally requires subsequent dismissal and one-year waiting period for expungement eligibility.",
      finalJudgment: false,
    }),

    "Defer-No Contest Plea": (charge, additionalFactors) => ({
      status: "Deferred",
      explanation:
        "Deferred acceptance disposition normally requires subsequent dismissal and one-year waiting period for expungement eligibility.",
      finalJudgment: false,
    }),

    "Commitment to Circuit Court": (charge, additionalFactors) => ({
      status: "Possibly Expungeable",
      explanation: "See Circuit Court case for expungement determination.",
      finalJudgment: false,
    }),

    "Remanded to District Court": (charge, additionalFactors) => ({
      status: "Possibly Expungeable",
      explanation: "See District Court case for expungement determination.",
      finalJudgment: false,
    }),

    "Dismissed Without Prejudice": (charge, additionalFactors) => ({
      status: "Possibly Expungeable",
      explanation: "Unable to determine if eligible for expungement.",
      finalJudgment: true,
    }),

    // "Dismissed Upon Nolle Prosequi": (charge, additionalFactors) => ({
    //   status: "Expungeable",
    //   explanation: "Nolle prosequi and dismissed with prejudice.",
    //   finalJudgment: true,
    // }),

    "Dismissed Upon Nolle Prosequi": (charge, additionalFactors) => {
      let result = {
        status: "Possibly Expungeable",
        explanation: "Expungeable if dismissed with prejudice.",
      };
      if (additionalFactors?.withPrejudice) {
        result = {
          status: "Expungeable",
          explanation: "Nolle prosequi and dismissed with prejudice.",
          finalJudgment: true,
        };
      } else {
        result = {
          status: "Possibly Expungeable",
          explanation: "Nolle prosequi without prejudice.",
          finalJudgment: false,
        };
      }
      return result;
    },

    Dismissed: (charge, additionalFactors) => ({
      status: "Possibly Expungeable",
      explanation: "Unable to determine if eligible for expungement.",
      finalJudgment: false,
    }),

    "Nolle Prosequi": (charge, additionalFactors) => {
      let result = {
        status: "Possibly Expungeable",
        explanation: "Expungeable if dismissed with prejudice.",
      };
      if (additionalFactors?.withPrejudice) {
        result = {
          status: "Expungeable",
          explanation: "Nolle prosequi and dismissed with prejudice.",
          finalJudgment: true,
        };
      } else {
        result = {
          status: "Possibly Expungeable",
          explanation: "Nolle prosequi without prejudice.",
          finalJudgment: false,
        };
      }
      return result;
    },

    "Guilty": (charge, additionalFactors) => {
      const postConvictionResult = this.expungeAfterConviction(charge);
      let result = postConvictionResult
        ? postConvictionResult
        : {
            status: "Not Expungeable",
            explanation: "Non-expungeable adverse disposition.",
            finalJudgment: true,
          };
      return result;
    },
    "Nolo Contendere": (charge, additionalFactors) => {
      const postConvictionResult = this.expungeAfterConviction(charge);
      let result = postConvictionResult
        ? postConvictionResult
        : {
            status: "Not Expungeable",
            explanation: "Non-expungeable adverse disposition.",
            finalJudgment: true,
          };
      return result;
    },
    "Judgment for State": (charge, additionalFactors) => ({
      status: "Not Expungeable",
      explanation: "Non-expungeable adverse disposition.",
      finalJudgment: true,
    }),

    "Default Judgment": (charge, additionalFactors) => ({
      status: "Not Expungeable",
      explanation: "Non-expungeable adverse disposition.",
      finalJudgment: false,
    }),
  };

  //////////////// DYNAMICALLY GENERATED LISTS OF DISPOSITION TYPES ////////////////
  // List of adverse final dispositions that are not expungeable
  // NB: Some might actually be expungeable (e.g., first time class C property felonies)
  //    depending on result of expungeAfterConviction method
  static ADVERSE_FINAL_DISPOSITIONS = Object.keys(this.DISPOSITION_RULES).filter(key => {
    const result = this.DISPOSITION_RULES[key]({}, {});
    return result.status === "Not Expungeable";
  });

  // List of deferred dispositions
  static DEFERRED_DISPOSITIONS = Object.keys(this.DISPOSITION_RULES).filter(key => {
    const result = this.DISPOSITION_RULES[key]({}, {});
    return result.status === "Deferred";
  })

  // List of dispositions that are definitely expungeable
  static EXPUNGEABLE_DISPOSITIONS = Object.keys(this.DISPOSITION_RULES).filter(key => {
    const result = this.DISPOSITION_RULES[key]({}, {});
    return result.status === "Expungeable";
  });

  ///////////////////////////////// END OF DYNAMIC LISTS /////////////////////////////////

  static isChargeExpungeable(
    charge,
    caseType,
    filingDate,
    additionalFactors = {}
  ) {
    console.log(`Evaluating charge:`, charge);
    //console.log(`Additional factors: ${JSON.stringify(additionalFactors)}`);

    // No disposition found (but check docket for dismissal on State's oral motion where implemented)
    const noDispositionFoundResult_Pending = {
      status: "Pending",
      explanation: "Unable to find disposition. Case may still be pending.",
    };
    
    const noDispositionFound_oralMotionDismissalInDocket = {
      status: "Expungeable",
      explanation:
        "Dismissed on State's oral motion but could not find explicit presence/absence of prejudice in data. Charge is probably expungeable.",
    };

    if (charge.dispositions.length === 0) {
      // ...because no dispositions are present
      if (additionalFactors?.dismissedOnOralMotion) {
        // Dismissed on oral motion: HRS 831-3.2(3)
        return noDispositionFound_oralMotionDismissalInDocket;
      } 
      return noDispositionFoundResult_Pending;
      
      //return result;
    } else if (charge.dispositions.every((disposition) => !disposition)) {
      // ...because dispositions are present but all are empty
      if (additionalFactors?.dismissedOnOralMotion) {
        // Dismissed on oral motion: HRS 831-3.2(3)
        return noDispositionFound_oralMotionDismissalInDocket;
      } 
      return noDispositionFoundResult_Pending;
    }

    // Charge is violation: not expungeable under HRS b/c not a crime
    if (charge?.severity === "violation") {
      return {
        status: "Not Expungeable",
        explanation: "Civil infractions are not expungeable.",
      };
    }

    let currentStatus = {
      status: "Unknown",
      explanation: "Unrecognized disposition.",
      disposition: "",
      dispositionDate: "",
    };

    let hasDeferred = false;
    let deferralDate = null;
    let dismissalAfterDeferral = false;
    let dismissalDate = null;

    // DEBUG: list static lists of dispositions
    // console.log('STATIC LISTS OF DISPOSITIONS:');
    // console.log('Adverse final dispositions:', this.ADVERSE_FINAL_DISPOSITIONS);
    // console.log('Deferred dispositions:', this.DEFERRED_DISPOSITIONS);
    // console.log('Expungeable dispositions:', this.EXPUNGEABLE_DISPOSITIONS);


    // Handle all dispositions for each charge by evaluating them in chronological order
    for (let i = 0; i < charge.dispositions.length; i++) {
      const disposition = this.safeString(charge.dispositions[i]);
      const dispositionDate = new Date(charge.dispositionDates[i]);

      // Check if disposition matches a known rule (match is case-insensitive
      // and checks if the disposition string contains the rule key as a substring)
      const ruleKey = Object.keys(this.DISPOSITION_RULES).find((key) =>
        this.safeIncludes(disposition, key)
      );

      if (ruleKey) {
        const result = this.DISPOSITION_RULES[ruleKey](
          charge,
          additionalFactors
        );

        console.log(`Dispositon: '${disposition}' matched rule: '${ruleKey}'`);
        console.log(`Result:`, result);

        // Handle innocence/definitely expungeable
        // if (this.safeIncludes(disposition, "Not Guilty")) {
        if (this.EXPUNGEABLE_DISPOSITIONS.some(disp => this.safeIncludes(disposition, disp))) {
          return {
            ...result,
            disposition,
            dispositionDate: charge.dispositionDates[i],
          };
        }

        // Handle guilt - check for any adverse final dispositions using list
        if (this.ADVERSE_FINAL_DISPOSITIONS.some(disp => this.safeIncludes(disposition, disp))) {
          return result;
        }

        // Handle deferred acceptance dispositions
        if (
          result.status === "Deferred" ||
          additionalFactors?.deferredAcceptance
        ) {
          hasDeferred = true;
          deferralDate = dispositionDate;
          currentStatus = {
            ...result,
            disposition,
            dispositionDate: charge.dispositionDates[i],
          };
        }

        if (
          hasDeferred &&
          (ruleKey === "Dismissed With Prejudice" ||
            ruleKey === "Dsm With Prejudice" ||
            ruleKey === "Dsm With Prejudice Rule 48" ||
            ruleKey === "Dismissed")
        ) {
          dismissalAfterDeferral = true;
          dismissalDate = dispositionDate;
          currentStatus = {
            ...result,
            disposition,
            dispositionDate: charge.dispositionDates[i],
          };
          currentStatus = this.expungeAfterDeferral(
            currentStatus,
            deferralDate,
            dismissalAfterDeferral,
            dismissalDate
          );
        } else {
          // currentStatus = {
          //   ...result,
          //   disposition,
          //   dispositionDate: charge.dispositionDates[i],
          // };
          currentStatus = this.expungeAfterDeferral(
            currentStatus,
            deferralDate,
            dismissalAfterDeferral,
            dismissalDate
          );
        }
      }
    }

    // Handle statute of limitations
    // if (
    //   !currentStatus.explanation.includes("Deferred disposition") &&
    //   (
    //     currentStatus.status === "Possibly Expungeable" ||
    //     currentStatus.status === "Unknown"
    //   )
    if (
        this.expungeabilityDependsOnSoL(
          currentStatus.status,
          currentStatus.explanation
        )
    ) {
      const limitationsResult = this.expungeAfterLimitations(
        charge,
        caseType,
        filingDate,
        additionalFactors
      );
      currentStatus = {
        ...limitationsResult,
        disposition: currentStatus.disposition,
        dispositionDate: currentStatus.dispositionDate,
      };

      return currentStatus;
    }

    return currentStatus;
  }

  static safeString(value) {
    return value ? String(value).trim() : "";
  }

  /**
   * Safely checks if a string includes a search string, ignoring case.
   * @param {string|null|undefined} str - The string to search within
   * @param {string|null|undefined} searchString - The string to search for
   * @returns {boolean} True if searchString is found within str, false otherwise
   */
  static safeIncludes(str, searchString) {
    
    return this.safeString(str)
      .toLowerCase()
      .includes(this.safeString(searchString).toLowerCase());
  }

  static expungeAfterConviction(charge) {
    // Handle expungeability after conviction for eligible offenses
    if (charge?.statute) {
      const statute = charge.statute;

      if (this.safeIncludes(statute, "291E-64(b)(1)")) {
        // DUI under 21: HRS 291E-64
        return {
          status: "Expungeable at 21",
          explanation:
            'If there are no prior alcohol enforcement contacts, the subsequently well-behaved defendant "may apply to the court" to expunge this first-time under-21 DUI after turning 21: HRS §291E-64(e).',
        };
      }

      // 1st/2nd-time drug offender (2004 or later): HRS 706-622.5
      if (
        this.safeIncludes(statute, "329-43.5") &&
        Date(charge.dispositionDates[charge.dispositionDates.length - 1]) >
          Date("12/31/2003") &&
        !this.safeIncludes(statute, "43.5(a)") &&
        !this.safeIncludes(statute, "43.5(b)")
      ) {
        return {
          status: "1st/2nd Expungeable",
          explanation:
            'If this is a first- or second-time offense, the court "shall" expunge it upon written application after successful completion of the substance abuse treatment program and satisfaction of probation conditions: HRS §706-622.5(4).',
        };
      }

      // First-time drug offender prior to 2004: HRS 706-622.8
      if (this.safeIncludes(statute, "329-43.5")) {
        return {
          status: "1st Expungeable",
          explanation:
            'The defendant/probation officer "may apply to the court" to expunge a pre-2004 first-time drug offense upon meeting the requirements of HRS §706-622.5(4): HRS §706-622.8.',
        };
      }

      // First-time property offender: HRS 706-622.9
      if (
        this.safeIncludes(statute, "708") &&
        charge?.severity &&
        charge.severity == "Felony C"
      ) {
        return {
          status: "Possibly Expungeable",
          explanation:
            "If this class C property felony is a first offense, the court &quot;shall&quot; expunge it upon the defendant's/probation officer's written application after successful completion of the substance abuse treatment program and satisfaction of probation conditions: HRS §706-622.9(3).",
        };
      }
    }
    return null;
  }

  static expungeAfterDeferral(
    currentStatus,
    deferralDate,
    dismissalAfterDeferral,
    dismissalDate
  ) {
    if (dismissalAfterDeferral) {
      const deferralResult = this.hasDeferralPeriodExpired(dismissalDate);
      let result;
      if (deferralResult.status === "Expired") {
        
        result = {
          status: "Expungeable",
          explanation: `Deferred disposition followed by dismissal. ${deferralResult.explanation}`,
          disposition: currentStatus.disposition,
          dispositionDate: currentStatus.dispositionDate,
        };
      } else {
        result = {
          status: `Expungeable After ${deferralResult.expiryDate}`,
          explanation: `Deferred disposition followed by dismissal. ${deferralResult.explanation}`,
          disposition: currentStatus.disposition,
          dispositionDate: currentStatus.dispositionDate,
        };
      }
      if (result) {
        if (deferralResult?.expiryDate) {
          result.deferralPeriodExpiryDate = deferralResult.expiryDate;
        }
      }
      console.log('ExpungeAfterDeferral result:', result);
      return result;
    } else {
      let result = {
        status: "Possibly Expungeable",
        explanation:
          "Deferred disposition found, but no subsequent dismissal as required by HRS 831-3.2(5) for expungement eligibility.",
        disposition: currentStatus.disposition,
        dispositionDate: currentStatus.dispositionDate,
      };
      console.log('ExpungeAfterDeferral result:', result);
      return result
    }
  }

  static hasDeferralPeriodExpired(dismissalDate) {
    const now = new Date();
    dismissalDate = new Date(dismissalDate);
    const timeSinceDismissal = now - dismissalDate;
    const deferralPeriodMilliseconds = 365 * 24 * 60 * 60 * 1000; // 1 year after discharge & dismissal of deferred acceptance disposition (in milliseconds)

    if (isNaN(dismissalDate.getTime())) {
      return {
        status: "Unknown",
        explanation:
          "Unable to determine deferral period due to invalid dismissal date.",
      };
    }

    const daysRemaining = Math.ceil(
      (deferralPeriodMilliseconds - timeSinceDismissal) / (24 * 60 * 60 * 1000)
    );
    const expiryDate = new Date(
      dismissalDate.getTime() + deferralPeriodMilliseconds
    ).toLocaleDateString();

    if (timeSinceDismissal > deferralPeriodMilliseconds) {
      return {
        status: "Expired",
        explanation: `One-year period afer discharge & dismissal of deferred acceptance disposition expired on ${expiryDate}.`,
        expiryDate: expiryDate,
        daysRemaining: daysRemaining,
      };
    } else {
      return {
        status: "Running",
        explanation: `One-year period afer discharge & dismissal of deferred acceptance disposition will expire on ${expiryDate}.`,
        expiryDate: expiryDate,
        daysRemaining: daysRemaining,
      };
    }
  }

  static hasPriorDeferredDisposition(charge) {
    return charge.dispositions.some(disposition => 
      this.DEFERRED_DISPOSITIONS.some(deferredType => 
        this.safeIncludes(disposition, deferredType)
      )
    );
  }

  // Determine whether expungeability depends on statute of limitations based on charge
  // disposition status and explanation properties (for use with is ChargeExpungeable method)
  static expungeabilityDependsOnSoL(dispositionStatus, explanation) {
    // No: disposition is in static list ADVERSE_FINAL_DISPOSITIONS
    if (this.ADVERSE_FINAL_DISPOSITIONS.some(disp => this.safeIncludes(explanation, disp))) {
      console.log('Expungeability does NOT depend on statute of limitations: adverse final disposition');
      return false;
    }
    // No: disposition explanation is some kind of deferral
    if (this.safeIncludes(explanation, "Deferred disposition")) {
      console.log('Expungeability does NOT depend on statute of limitations: deferred disposition');
      return false;
    }
    // No: disposition is definitely expungeable
    if (this.EXPUNGEABLE_DISPOSITIONS.some(disp => this.safeIncludes(explanation, disp))) {
      console.log('Expungeability does NOT depend on statute of limitations: disposition is definitely expungeable');
      return false;
    }

    // Yes: expungement may depend on statute of limitations
    console.log('Expungeability depends on statute of limitations');
    return true;
  }

  // Evaluate expungeability based on statute of limitations
  static expungeAfterLimitations(
    charge,
    caseType,
    filingDate,
    additionalFactors
  ) {
    const statuteResult = this.hasStatuteOfLimitationsExpired(
      charge,
      filingDate,
      caseType
    );
    if (statuteResult.status === "Expired") {
      return {
        status: "Expungeable",
        explanation: statuteResult.explanation,
      };
    } else if (statuteResult.status === "Unlimited") {
      return {
        status: "Possibly Expungeable",
        explanation: statuteResult.explanation,
      };
    } else if (statuteResult.status === "Running") {
      return {
        status: `Statute of Limitations ${statuteResult.expiryDate}`,
        explanation: statuteResult.explanation,
      };
    } else if (statuteResult.status === "Possibly Expired") {
      return {
        status: "Possibly Expungeable",
        explanation: statuteResult.explanation,
      };
    } else if (statuteResult.status === "Unlimited") {
      return {
        status: "Not Expungeable",
        explanation: statuteResult.explanation,
      };
    }
    return {
      status: "Possibly Expungeable",
      explanation: `Unknown statute of limitations for charge: ${charge.charge}.`,
    };
  }

  static hasStatuteOfLimitationsExpired(charge, filingDate, caseType = "") {
    const now = new Date();
    const filingDateObj = new Date(filingDate);
    const offenseDateObj = new Date(charge.offenseDate);
    const lastDispositionDateObj = new Date(
      charge.dispositionDates[charge.dispositionDates.length - 1]
    );

    // Determine the severity and corresponding statute of limitations
    let statuteOfLimitations;
    let severityDescription;
    const normalizedSeverity = utils
      .normalizeSeverity(charge, caseType)
      .toLowerCase();

    console.log(`Normalized severity: '${normalizedSeverity}'`);

    if (normalizedSeverity == "petty misdemeanor") {
      statuteOfLimitations = 1 * 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      severityDescription = "Petty Misdemeanor";
    } else if (normalizedSeverity == "misdemeanor") {
      statuteOfLimitations = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
      severityDescription = "Misdemeanor";
    } else if (normalizedSeverity == "felony a") {
      statuteOfLimitations = 6 * 365 * 24 * 60 * 60 * 1000; // 6 years in milliseconds
      severityDescription = "Felony A";
    } else if (normalizedSeverity == "§708 fraud felony") {
      statuteOfLimitations = 5 * 365 * 24 * 60 * 60 * 1000; // 5 years in milliseconds
      severityDescription = "§708 fraud felony";
    } else if (normalizedSeverity == "felony b") {
      statuteOfLimitations = 3 * 365 * 24 * 60 * 60 * 1000; // 3 years in milliseconds
      severityDescription = "Felony B";
    } else if (normalizedSeverity == "felony c") {
      statuteOfLimitations = 3 * 365 * 24 * 60 * 60 * 1000; // 3 years in milliseconds
      severityDescription = "Felony C";
    } else if (normalizedSeverity == "§701-108(2) felony") {
      statuteOfLimitations = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years in milliseconds
      severityDescription = "§701-108(2) felony";
    } else if (normalizedSeverity == "§701-108(1) felony") {
      statuteOfLimitations = 999 * 365 * 24 * 60 * 60 * 1000; // 999 years in milliseconds (i.e., no statute of limitations)
      severityDescription = "§701-108(1) felony";
    } else if (normalizedSeverity == "§707-733.6 felony") {
      statuteOfLimitations = 999 * 365 * 24 * 60 * 60 * 1000; // 999 years in milliseconds (i.e., no statute of limitations)
      severityDescription = "§707-733.6 Felony";
    } else {
      console.log(
        `Returning unknown statute of limitations for severity: ${normalizedSeverity}`
      );
      return {
        status: "Unknown",
        explanation:
          "Unable to determine statute of limitations due to unknown severity.",
      };
    }

    if (statuteOfLimitations === 999 * 365 * 24 * 60 * 60 * 1000) {
      return {
        status: "Unlimited",
        explanation: `No statute of limitations for a ${severityDescription}.`,
        period: "Unlimited",
      };
    }

    console.log(
      `Statute of limitations for ${severityDescription}: ${statuteOfLimitations} ms`
    );

    let expiryDate, status, certainty, explanation;

    if (
      !isNaN(offenseDateObj.getTime()) &&
      !isNaN(filingDateObj.getTime()) &&
      lastDispositionDateObj &&
      !isNaN(lastDispositionDateObj.getTime())
    ) {
      // Calculate tolling period
      const tollingPeriod =
        lastDispositionDateObj.getTime() - filingDateObj.getTime();

      // Calculate expiry date considering tolling
      expiryDate = new Date(
        offenseDateObj.getTime() + statuteOfLimitations + tollingPeriod
      );
      certainty = "Certain";

      if (now > expiryDate) {
        status = "Expired";
        explanation = `Statute of limitations expired on ${expiryDate.toLocaleDateString()}, accounting for ${Math.round(
          tollingPeriod / (24 * 60 * 60 * 1000)
        )} days of tolling during prosecution.`;
      } else {
        status = "Running";
        explanation = `Statute of limitations will expire on ${expiryDate.toLocaleDateString()}, accounting for ${Math.round(
          tollingPeriod / (24 * 60 * 60 * 1000)
        )} days of tolling during prosecution.`;
      }
    } else if (!isNaN(lastDispositionDateObj.getTime())) {
      // If filing date available but disposition is, calculate from then
      expiryDate = new Date(
        lastDispositionDateObj.getTime() + statuteOfLimitations
      );
      certainty = "Uncertain";

      if (now > expiryDate) {
        status = "Possibly Expired";
        explanation = `Statute of limitations may have expired on ${expiryDate.toLocaleDateString()}, calculating from disposition date. Unable to account for tolling due to missing filing date.`;
      } else {
        status = "Possibly Running";
        explanation = `Statute of limitations may expire on ${expiryDate.toLocaleDateString()}, calculating from disposition date. Unable to account for tolling due to missing filing date.`;
      }
    } else if (!isNaN(offenseDateObj.getTime())) {
      // Use offense date if available, but without tolling information
      expiryDate = new Date(offenseDateObj.getTime() + statuteOfLimitations);
      certainty = "Uncertain";

      if (now > expiryDate) {
        status = "Possibly Expired";
        explanation = `Statute of limitations may have expired on ${expiryDate.toLocaleDateString()}. Unable to account for tolling due to missing filing or disposition dates.`;
      } else {
        status = "Possibly Running";
        explanation = `Statute of limitations may expire on ${expiryDate.toLocaleDateString()}. Unable to account for tolling due to missing filing or disposition dates.`;
      }
    } else {
      // Fall back to filing date if offense date is not available
      expiryDate = new Date(filingDateObj.getTime() + statuteOfLimitations);
      certainty = "Uncertain";

      if (now > expiryDate) {
        status = "Possibly Expired";
        explanation = `Statute of limitations may have expired. Latest possible expiry was on ${expiryDate.toLocaleDateString()} (calculated from filing date as offense date not found). Unable to account for tolling.`;
      } else {
        status = "Possibly Running";
        explanation = `Statute of limitations may still be running. Will expire no later than ${expiryDate.toLocaleDateString()} (calculated from filing date as offense date not found). Unable to account for tolling.`;
      }
    }

    const daysRemaining = Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000));

    return {
      status,
      explanation,
      expiryDate: expiryDate.toLocaleDateString(),
      certainty,
      daysRemaining,
      period: statuteOfLimitations / (365 * 24 * 60 * 60 * 1000),
    };
  }

  static determineOverallExpungeability(charges) {
    let expungeableCount = 0;
    let possiblyExpungeableCount = 0;
    let notExpungeableCount = 0;
    let deferredCount = 0;
    let noDispositionCount = 0;
    let limitationsCount = 0;
    let whenDefendantTurns21Count = 0;
    let latestExpiryDate = null;
    let explanations = [];

    charges.forEach((charge) => {
      switch (charge.isExpungeable.status) {
        case "Expungeable":
          expungeableCount++;
          break;
        case "1st Expungeable":
        case "1st/2nd Expungeable":
        case "Possibly Expungeable":
          possiblyExpungeableCount++;
          break;
        case "Expungeable at 21":
          whenDefendantTurns21Count++;
          break;
        case "Not Expungeable":
          notExpungeableCount++;
          break;
        case "No Disposition Found":
          noDispositionCount++;
          break;
        case "Pending":
          noDispositionCount++;
          break;
        default:
          let expungeStatus = charge.isExpungeable.status;
          expungeStatus = expungeStatus.toLowerCase();
          if (
            expungeStatus.includes("deferred") ||
            expungeStatus.includes("expungeable after")
          ) {
            deferredCount++;
            if (charge.deferralPeriodExpiryDate) {
              updateLatestExpiryDate(
                charge.deferralPeriodExpiryDate,
                "Deferral",
                "Certain"
              );
            }
          } else if (expungeStatus.includes("statute")) {
            limitationsCount++;
            if (charge.statuteOfLimitationsExpiryDate) {
              updateLatestExpiryDate(
                charge.statuteOfLimitationsExpiryDate,
                "Statute",
                charge.statuteOfLimitationsCertainty
              );
            }
          }
      }
      explanations.push(
        `Charge ${charge.count}: ${charge.isExpungeable.status} - ${charge.isExpungeable.explanation}`
      );
    });

    function updateLatestExpiryDate(newDate, type, certainty) {
      const newDateObj = new Date(newDate);
      if (!latestExpiryDate || newDateObj > new Date(latestExpiryDate.date)) {
        latestExpiryDate = { date: newDate, type: type, certainty: certainty };
      }
    }

    let status, explanation;
    if (deferredCount + limitationsCount === charges.length) {
      if (latestExpiryDate) {
        const expiryPhrase =
          latestExpiryDate.type === "Statute"
            ? latestExpiryDate.certainty === "Certain"
              ? "statute of limitations expires"
              : "statute of limitations may expire"
            : "one-year period after dismissal and discharge ends";
        if (latestExpiryDate.certainty === "Uncertain") {
          status = `Possibly Expungeable After ${latestExpiryDate.date}`;
        } else {
          status = `Expungeable After ${latestExpiryDate.date}`;
          explanation = `All charges expungeable when the ${expiryPhrase}`;
        }
      } else {
        status = "Expungeable After Unknown Period";
        explanation =
          "All charges may be expungeable after the applicable waiting period (see case for details).";
      }
    } else if (expungeableCount === charges.length) {
      status = "All Expungeable";
      explanation = "All charges in this case are expungeable.";
    } else if (notExpungeableCount === charges.length) {
      status = "None Expungeable";
      explanation = "None of the charges in this case are expungeable.";
    } else if (noDispositionCount === charges.length) {
      status = "Pending";
      explanation = "Cannot locate disposition(s). Case may still be pending.";
    } else if (whenDefendantTurns21Count === charges.length) {
      status = "Expungeable at 21";
      explanation =
        "All first-offense charges may be expungeable when the defendant turns 21 if subsequently well-behaved.";
    } else if (
      possiblyExpungeableCount + whenDefendantTurns21Count ===
      charges.length
    ) {
      status = "All Possibly Expungeable";
      explanation = "All charges in this case are possibly expungeable.";
    } else {
      if (expungeableCount > 0) {
        status = "Some Expungeable";
        explanation =
          "This case has a mix of expungeable, possibly expungeable, and/or non-expungeable charges.";
      } else {
        status = "Some Possibly Expungeable";
        explanation = "Some charge in this case may be expungeable.";
      }
    }
    console.log("Overall expungeability status:", status);

    return {
      status,
      explanation,
      chargeDetails: explanations.join("\n"),
    };
  }
}

// Base CaseProcessor class
class CaseProcessor {
  constructor() {
    this.caseInfo = utils.extractCaseInfo();
    this.caseType = this.constructor.name.replace("CaseProcessor", "");
    this.expungeabilityColumnId = `expungeability-column-${this.caseInfo.caseId}`;
    this.docketService = new DocketService();
    this.warrantStatus = null;  // Store warrant status
  }

  async collectCaseDetails() {
    let charges = await this.getCharges();
    for (let charge of charges) {
      // const deferralPeriod = ExpungeabilityEvaluator.hasDeferralPeriodExpired(charge, this.caseInfo.filingDate);
      const statuteOfLimitations =
        ExpungeabilityEvaluator.hasStatuteOfLimitationsExpired(
          charge,
          this.caseInfo.filingDate,
          this.caseType
        );
      charge.severity = utils.normalizeSeverity(charge, this.caseType);
      charge.statuteOfLimitationsPeriod =
        statuteOfLimitations.period != "Unlimited"
          ? `${statuteOfLimitations.period} year(s)`
          : statuteOfLimitations.period;
      charge.statuteOfLimitationsExpiryDate = statuteOfLimitations.expiryDate;
      charge.statuteOfLimitationsCertainty = statuteOfLimitations.certainty;
      charge.statuteOfLimitationsStatus = statuteOfLimitations.status;
    }

    const additionalFactors = await this.getAdditionalFactors();
    let caseDetails = {
      caseType: this.caseType,
      caseId: this.caseInfo.caseId,
      courtLocation: this.caseInfo.courtLocation,
      courtCircuit: this.caseInfo.courtCircuit,
      filingDate: this.caseInfo.filingDate,
      defendantName: this.caseInfo.defendantName,
      charges: charges,
      additionalFactors: additionalFactors,
      warrantStatus: additionalFactors.warrantDetails, // New field for warrant information
      ...this.getAdditionalDetails(),
    };
    for (let charge of caseDetails.charges) {
      // Evaluate expungeability for each charge
      charge.isExpungeable = ExpungeabilityEvaluator.isChargeExpungeable(
        charge,
        this.caseType,
        this.caseInfo.filingDate,
        additionalFactors
      );

      // If dispositions are all empty but additionalFactors?.dismissedOnOralMotion,
      // set all dispositions to "Dismissed on State's oral motion"
      if (
        charge.dispositions.every((disposition) => !disposition) &&
        additionalFactors?.dismissedOnOralMotion
      ) {
        charge.dispositions = Array(charge.dispositions.length).fill(
          "Dismissed on State's oral motion"
        );
        
        if (additionalFactors?.dismissalDate) {
          charge.dispositionDates = Array(charge.dispositionDates.length).fill(
            additionalFactors.dismissalDate
          );
        }
      }

      // Set deferral period expiry date if applicable
      charge.deferralPeriodExpiryDate = charge.isExpungeable
        ?.deferralPeriodExpiryDate
        ? charge.isExpungeable.deferralPeriodExpiryDate
        : null;
    }
    for (let charge of caseDetails.charges) {
      // Set Statute of Limitations status if disposition is not a final judgment, not a deferred acceptance disposition, and not a commitment/remand
      if (charge?.dispositions && charge.dispositions.length > 0) {
        if (
          charge.isExpungeable.finalJudgment ||
          charge.dispositions[charge.dispositions.length - 1].includes(
            "Defer"
          ) ||
          charge.dispositions[charge.dispositions.length - 1].includes(
            "Commit"
          ) ||
          charge.dispositions[charge.dispositions.length - 1].includes("Remand")
        ) {
          charge.statuteOfLimitationsStatus = "N/A";
        }
      }
    }
    return caseDetails;
  }

  getAdditionalDetails() {
    return {};
  }

  isExpungeabilityAdded() {
    return $(`#${this.expungeabilityColumnId}`).length > 0;
  }

  markExpungeabilityAdded() {
    $("body").append(
      `<div id="${this.expungeabilityColumnId}" style="display:none;"></div>`
    );
  }

  removeExistingExpungeabilityColumn() {
    $(`#${this.expungeabilityColumnId}`).remove();
    $('th:contains("Expungeability")').remove();
    $('th:contains("Status")').remove();
    $("td[data-expungeability]").remove();
    $("span[data-expungeability]").remove();
  }

  async process() {
    const caseDetails = await this.collectCaseDetails();
    this.warrantStatus = caseDetails.warrantStatus;  // Store warrant status

    const overallExpungeability =
      ExpungeabilityEvaluator.determineOverallExpungeability(
        caseDetails.charges
      );

    // Retrieve the existing override status if the case already exists
    let existingOverride = false; // Override expungement determination
    let existingOverrideWarrant = false; // Override warrant status
    await new Promise((resolve) => {
        chrome.storage.local.get('cases', function(result) {
            const existingCase = result.cases?.find(c => c.CaseNumber === caseDetails.caseId);
            if (existingCase) {
                existingOverride = existingCase.Override || false;
                existingOverrideWarrant = existingCase.OverrideWarrant || false;
            }
            resolve();
        });
    });

    // console.log(`caseDetails before saving to Chrome local storage:`);
    // console.log(caseDetails);

    saveToChromeLocalStorage(
      this.caseInfo.caseId,
      overallExpungeability.status,
      this.caseInfo.courtLocation,
      this.caseInfo.filingDate,
      this.caseInfo.defendantName,
      {
        ...caseDetails,
        overallExpungeability,
      },
      existingOverride,
      existingOverrideWarrant
    );

    console.log("Saving case to storage:", {
      caseId: this.caseInfo.caseId,
      status: overallExpungeability.status,
      override: existingOverride,
      overrideWarrant: existingOverrideWarrant
    });

    this.updateUI(caseDetails.charges, overallExpungeability.status, caseDetails.warrantStatus);

    if (this.isExpungeabilityAdded()) {
      console.log(
        "Information already added. Not adding column."
      );
      return;
    }
    this.markExpungeabilityAdded();
  }

  async getCharges() {
    throw new Error("getCharges method must be implemented by subclasses");
  }

  async getAdditionalFactors() {
    const entries = await this.docketService.getDocketEntries();
    
    // Get warrant status
    const warrantStatus = await this.docketService.analyzeWarrantStatus(entries);
    
    // Get case-type specific factors
    const typeSpecificFactors = await this.getTypeSpecificFactors();
    
    return {
        warrantDetails: warrantStatus,
        hasOutstandingWarrant: warrantStatus.hasOutstandingWarrant,
        ...typeSpecificFactors
    };
  }

// New method for case-type specific factors
async getTypeSpecificFactors() {
    return {};  // Override in specific processors
}

  updateUI(charges, overallExpungeabilityStatus) {
    throw new Error("updateUI method must be implemented by subclasses");
  }

  // Normal bootstrap tooltips (not enough room for content)
  initTooltips() {
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
}

// CPC Case Processor
class CPCCaseProcessor extends CaseProcessor {
  async getCharges() {
    const chargesTable = this.getCPCChargesTable();
    //console.log("chargesTable:", chargesTable.html());
    const offenses = [];

    chargesTable.find("tr:not(:first-child)").each((index, row) => {
      try {
        const cells = $(row).find("td");
        //console.log(`Processing row ${index + 1}, cells found: ${cells.length}`);

        if (cells.length < 6) {
          console.log(`Row ${index + 1} has insufficient cells, skipping.`);
          return;
        }

        const offenseDetailsHTML = $(cells[1]).html();
        //console.log(`Row ${index + 1} offense details HTML:`, offenseDetailsHTML);

        if (!offenseDetailsHTML) {
          console.log(`Row ${index + 1} has no offense details, skipping.`);
          return;
        }

        const detailsParts = offenseDetailsHTML
          .split("<br>")
          .map((part) => part.trim());
        //console.log(`Row ${index + 1} details parts:`, detailsParts);

        let statuteWithDescription = detailsParts;
        if (detailsParts.length > 1) {
          statuteWithDescription = detailsParts[0].split(" - ");
        }

        const dispositionWithDates = $(cells[3]).html().split("<br>");
        const dispositions = [];
        const dispositionDates = [];

        dispositionWithDates.forEach((item) => {
          const trimmedItem = item.trim();
          if (trimmedItem) {
            // Only process non-empty strings
            const parts = trimmedItem.split("-");
            if (parts.length == 2) {
              dispositions.push(parts[0].trim());
              dispositionDates.push(parts[1].trim());
            } else if (parts.length > 2) {
              dispositions.push(`${parts[0].trim()}-${parts[1].trim()}`);
              dispositionDates.push(parts[2].trim());
            } else {
              dispositions.push(parts[0].trim());
              dispositionDates.push("");
            }
          }
        });

        const offense = {
          count: $(cells[0]).text().trim(),
          statute: statuteWithDescription[0] || "",
          charge: statuteWithDescription[1] || "",
          severity: detailsParts[1] || "",
          offenseDate: (detailsParts[2] || "").replace("Ofs Dt :", "").trim(),
          citationArrestNumbers: (detailsParts[3] || "")
            .replace("Citation/Arrest #:", "")
            .trim(),
          plea: $(cells[2]).text().trim(),
          dispositions: dispositions,
          dispositionDates: dispositionDates,
          //sentencing: $(cells[4]).text().trim(),
          sentencing: $(cells[4]).html(),
          offenseNotes: $(cells[5]).text().trim(),
        };

        //console.log(`Row ${index + 1} parsed offense:`, offense);
        offenses.push(offense);
      } catch (error) {
        console.error(`Error processing row ${index + 1}:`, error);
      }
    });

    console.log("All parsed offenses:", offenses);
    return offenses;
  }

  // async getAdditionalFactors() {
  //   const docket = await this.getCPCDocket();
  //   const withPrejudice = this.checkNolleProsequi(docket);
  //   const deferredAcceptance = this.checkdeferredAcceptance(docket);
  //   return { withPrejudice, deferredAcceptance };
  // }

  async getTypeSpecificFactors() {
    const entries = await this.docketService.getDocketEntries();
    const dismissalStatus = await this.docketService.checkDismissalWithPrejudice(entries);
    const deferralStatus = await this.docketService.checkDeferredAcceptance(entries);
    
    return {
        withPrejudice: dismissalStatus.withPrejudice,
        deferredAcceptance: deferralStatus.deferredAcceptance
    };
  }

  getAdditionalDetails() {
    // Add any case-type specific details here
    return {
      specificInfo: "This is specific to CPC cases",
    };
  }

  getCPCChargesTable() {
    return $("tbody")
      .filter(function () {
        return (
          $(this)
            .find("tr:first th")
            .filter(function () {
              return $(this).text().trim() === "Plea";
            }).length > 0
        );
      })
      .first();
  }

  // async getCPCDocket() {
  //   const docketTable = $("tbody")
  //     .filter(function () {
  //       return (
  //         $(this)
  //           .find("tr:first th")
  //           .filter(function () {
  //             return $(this).text().trim() === "Docket";
  //           }).length > 0
  //       );
  //     })
  //     .first();

  //   const courtRecords = [];

  //   docketTable.find("tr:not(:first-child)").each((index, row) => {
  //     const cells = $(row).find("td");
  //     const record = {
  //       docketNumber: $(cells[0]).text().trim(),
  //       date: $(cells[1]).text().trim(),
  //       defendant: $(cells[3]).text().trim(),
  //       party: $(cells[4]).text().trim(),
  //       docket: {
  //         text: $(cells[2]).text().trim(),
  //         documentLinks: [],
  //       },
  //     };

  //     $(cells[2])
  //       .find("img")
  //       .each((index, link) => {
  //         const onclickAttr = $(link).attr("onclick");
  //         const docMatch = onclickAttr.match(
  //           /documentSelection\('([^']+)', '([^']+)'/
  //         );
  //         if (docMatch) {
  //           record.docket.documentLinks.push({
  //             documentId: docMatch[1],
  //             documentType: docMatch[2],
  //             src: $(link).attr("src"),
  //           });
  //         }
  //       });

  //     courtRecords.push(record);
  //   });

  //   return courtRecords;
  // }

  // checkNolleProsequi(docket) {
  //   return docket.some((record) => {
  //     const docketTextLower = record.docket.text.toLowerCase();
  //     return (
  //       docketTextLower.includes(
  //         "ord/nolle-prosequimotion for nolle prosequi with prejudice"
  //       ) && !docketTextLower.includes("den")
  //     );
  //   });
  // }

  // checkdeferredAcceptance(docket) {
  //   return docket.some((record) => {
  //     const docketTextLower = record.docket.text.toLowerCase();
  //     return docketTextLower.includes(
  //       "order granting motion for deferred acceptance of"
  //     );
  //   });
  // }

  updateUI(charges, overallExpungeabilityStatus) {
    this.removeExistingExpungeabilityColumn();

    const chargesTable = this.getCPCChargesTable();
    //console.log('Charges table structure:', chargesTable.html());

    chargesTable.find("tr:first").append("<th>Expungeability</th>");

    // Add warrant status indicator if there's an active warrant
    if (this.warrantStatus?.hasOutstandingWarrant) {
      chargesTable.before(`
          <div class="alert alert-danger" role="alert">
              <strong>⚠️ Outstanding Warrant</strong>: ${warrantStatus.explanation}
          </div>
      `);
    }

    let chargeIndex = 0;
    let rowsToSkip = 0;

    chargesTable.find("tr:not(:first)").each((index, row) => {
      const $row = $(row);
      //console.log(`Processing row ${index + 1}:`, $row.html());

      if (rowsToSkip > 0) {
        //console.log(`Skipping row ${index + 1} (part of previous charge)`);
        rowsToSkip--;
        return;
      }

      const $firstCell = $row.find("td:first");
      const rowspan = parseInt($firstCell.attr("rowspan")) || 1;

      if (chargeIndex < charges.length) {
        const charge = charges[chargeIndex];
        let bgColor, text;

        switch (charge.isExpungeable.status) {
          case "Expungeable":
            bgColor = "lightgreen";
            text = "Expungeable";
            break;
          case "Possibly Expungeable":
            bgColor = "darkorange";
            text = "Possibly Expungeable";
            break;
          case "Not Expungeable":
            bgColor = "lightcoral";
            text = "Not Expungeable";
            break;
          default:
            bgColor = "rgb(255, 193, 7)";
            text = charge.isExpungeable.status;
        }

        const dispositionsText = charge.dispositions
          .map(
            (disp, i) =>
              `${disp} (${charge.dispositionDates[i] || "Date Not Found"})`
          )
          .join(", ");

        let tooltipText = charge.isExpungeable.explanation;
        if (charge.dispositions.length > 0) {
          tooltipText = `${tooltipText}\n\nDisposition(s): ${dispositionsText}`;
        }

        $row.append(
          utils.createTooltipCell(
            text,
            bgColor,
            tooltipText,
            `rowspan="${rowspan}"`
          )
        );
        //console.log(`Added expungeability cell for charge ${chargeIndex + 1} with rowspan ${rowspan}`);

        chargeIndex++;
        rowsToSkip = rowspan - 1;
      } else {
        console.warn(
          `More rows than charges. Row: ${index + 1}, Charges: ${
            charges.length
          }`
        );
      }
    });

    console.log(
      `Updated UI for ${chargeIndex} charges out of ${charges.length}`
    );

    // Initialize tooltips
    this.initTooltips();
  }
}

// DTC Case Processor
class DTCCaseProcessor extends CaseProcessor {
  async getCharges() {
    const violations = [];
    let currentViolation = null;

    $("table.iceDatTbl.data:contains('Violation'):contains('Disposition')")
      .eq(0)
      .find("tr")
      .each(function (index, row) {
        const cells = $(row).find("td");
        if (cells.length >= 7) {
          const violationNumber = cells.eq(0).text().trim();
          if (violationNumber) {
            if (currentViolation) {
              violations.push(currentViolation);
            }
            currentViolation = {
              count: violationNumber,
              statute: cells.eq(1).text().trim(),
              charge: cells.eq(2).text().trim(),
              offenseDate: cells.eq(3).text().trim(),
              dispositions: [cells.eq(6).text().trim()],
              dispositionDates: [cells.eq(7).text().trim()],
              isExpungeable: false,
              rowspan: parseInt(cells.eq(0).attr("rowspan")) || 1,
            };
          } else if (currentViolation) {
            currentViolation.dispositions.push(cells.eq(6).text().trim());
            currentViolation.dispositionDates.push(cells.eq(7).text().trim());
          }
        }
      });

    if (currentViolation) {
      violations.push(currentViolation);
    }

    return violations;
  }

  getAdditionalDetails() {
    // Add any case-type specific details here
    return {
      // For example:
      specificInfo: "This is specific to DTC cases",
    };
  }

  updateUI(charges, overallExpungeabilityStatus) {
    this.removeExistingExpungeabilityColumn();

    const table = $(
      "table.iceDatTbl.data:contains('Violation'):contains('Disposition')"
    ).eq(0);

    table.find("tr:first").append("<th align='CENTER'>Expungeability</th>");

    const secondHeaderRow = table.find("tr:eq(1)");
    const existingHeaderStyle = secondHeaderRow.find("th:first").attr("style");
    secondHeaderRow.append(`<th ${existingHeaderStyle}>Status</th>`);

    let chargeIndex = 0;
    table.find("tr:gt(1)").each((index, row) => {
      const cells = $(row).find("td");
      if (cells.length >= 7) {
        const violationNumber = cells.eq(0).text().trim();
        if (violationNumber && chargeIndex < charges.length) {
          const charge = charges[chargeIndex];
          let bgColor, text;

          switch (charge.isExpungeable.status) {
            case "Expungeable":
              bgColor = "lightgreen";
              text = "Expungeable";
              break;
            case "Possibly Expungeable":
              bgColor = "darkorange";
              text = "Possibly Expungeable";
              break;
            case "Not Expungeable":
              bgColor = "lightcoral";
              text = "Not Expungeable";
              break;
            default:
              bgColor = "rgb(255, 193, 7)";
              text = charge.isExpungeable.status;
          }

          $(row).append(
            utils.createTooltipCell(
              text,
              bgColor,
              charge.isExpungeable.explanation,
              `rowspan="${charge.rowspan}"`
            )
          );
          chargeIndex++;
        }
      }
    });

    // Initialize tooltips
    this.initTooltips();
  }
}

class DCWCaseProcessor extends CaseProcessor {
  async getCharges() {
    const charges = [];
    $("table.iceDatTbl.data:contains('COUNT:')").each((index, table) => {
      const $table = $(table);
      let count = $table.find("th").text().trim().replace("COUNT:", "").trim();
      let $nextTable = $table.next("table");

      let count_arr = count.split(" ");
      if (count_arr.length > 1) {
        count = count_arr[0];
      }

      const charge = {
        count: count,
        statute: "",
        plea: "",
        dispositions: [],
        dispositionDates: [],
      };

      while (
        $nextTable.length &&
        !$nextTable.is("table.iceDatTbl.data:contains('COUNT:')")
      ) {
        let isCollectingDispositions = false;

        $nextTable.find("tr").each((i, row) => {
          const $cells = $(row).find("td");
          if ($cells.length >= 2) {
            const label = $cells.eq(0).text().trim();
            const value = $cells.eq(1).text().trim();
            const date = $cells.eq(2).text().trim();

            if ($cells.eq(1).text().includes("HRS")) {
              charge.severity = $cells.eq(0).text().trim();
              charge.statute = $cells.eq(1).text().trim();
              charge.charge = $cells.eq(2).text().trim();
            } else if (value.includes("Vio Dt: ")) {
              charge.offenseDate =
                charge.offenseDate || value.replace("Vio Dt: ", "").trim();
            } else if (label === "Plea:") {
              charge.plea = charge.plea || value;
            } else if (label === "Disposition:" || isCollectingDispositions) {
              if (value && date && !["Sentence:", "Plea:"].includes(label)) {
                charge.dispositions.push(value);
                charge.dispositionDates.push(date);
                isCollectingDispositions = true;
              } else if (label === "Sentence:") {
                isCollectingDispositions = false;
              }
            }
          } else if ($cells.length === 1 && isCollectingDispositions) {
            // This handles cases where there's no date for a disposition
            const value = $cells.eq(0).text().trim();
            if (value) {
              charge.dispositions.push(value);
              charge.dispositionDates.push("");
            }
          }
        });

        $nextTable = $nextTable.next("table");
      }

      charges.push(charge);
    });

    return charges;
  }

  async getAdditionalFactors() {
    // Add any DCW-specific factors here if needed
    return {};
  }

  getAdditionalDetails() {
    // Add any DCW-specific details here
    return {
      // For example:
      dcwSpecificInfo: "This is specific to DCW cases",
    };
  }

  updateUI(charges, overallExpungeabilityStatus) {
    charges.forEach((charge, index) => {
      const $countTable = $(
        `table.iceDatTbl.data:contains('COUNT: ${charge.count}')`
      );
      const $chargeTable = $countTable.next("table");

      $countTable.find("span[data-expungeability]").remove();

      let bgColor, text;
      switch (charge.isExpungeable.status) {
        case "Expungeable":
          bgColor = "lightgreen";
          text = "Expungeable";
          break;
        case "Possibly Expungeable":
          bgColor = "darkorange";
          text = "Possibly Expungeable";
          break;
        case "Not Expungeable":
          bgColor = "lightcoral";
          text = "Not Expungeable";
          break;
        default:
          bgColor = "rgb(255, 193, 7)";
          text = charge.isExpungeable.status;
      }

      $countTable.find("th").append(`
                <span style="float: right; background-color: ${bgColor}; padding: 2px 5px; border-radius: 3px;" 
                      data-expungeability data-bs-toggle="tooltip" data-placement="top" 
                      title="${charge.isExpungeable.explanation}">
                    ${text}
                </span>
            `);
    });

    // Initialize tooltips
    this.initTooltips();
  }
}

class PCCaseProcessor extends CaseProcessor {
  async getCharges() {
    const charges = [];
    $("table.iceDatTbl.data:contains('Offense Details')").each(
      (index, table) => {
        const $rows = $(table).find("tr");
        $rows.each((rowIndex, row) => {
          if (rowIndex === 0) return; // Skip header row

          const $cells = $(row).find("td");
          if ($cells.length >= 6) {
            const offenseDetailsHTML = $cells.eq(1).html();
            const detailsParts = offenseDetailsHTML.split("<br>");
            let statuteWithDescription = detailsParts;
            if (detailsParts.length > 1) {
              statuteWithDescription = detailsParts[0].split(" - ");
            }

            const dispositionWithDate = $cells.eq(3).text().trim();
            const dispositionParts = dispositionWithDate.split("-");
            const disposition = dispositionParts[0].trim();
            const dispositionDate = dispositionParts[1]
              ? dispositionParts[1].trim()
              : "";

            // count, statute, charge, severity, plea, sentencing, and offenseNotes have fixed locations
            let temp_count = $cells.eq(0).text().trim();
            let temp_statute = statuteWithDescription[0] || "";
            let temp_charge = statuteWithDescription[1] || "";
            let temp_severity = detailsParts[1] || "";
            let temp_plea = $cells.eq(2).text().trim();
            let temp_sentencing = $cells.eq(4).html();
            let temp_offenseNotes = $cells.eq(5).text().trim();
            
            // citationArrestNumbers will be detailsParts[3] if offenseDate
            // is present, and will otherwise be detailsParts[2] and OTN # will
            // be detailsParts[3]
            let temp_citationArrestNumbers = "";
            let temp_otnNumbers = "";
            let temp_offenseDate = "";

            if (detailsParts[2].includes("Citation/Arrest #:")) {
              temp_citationArrestNumbers = detailsParts[2].replace("Citation/Arrest #:", "").trim();
              if (detailsParts[3].includes("OTN #:")) {
                temp_otnNumbers = detailsParts[3].replace("OTN #:", "").trim();
              }
            } else {
              temp_citationArrestNumbers = detailsParts[3].replace("Citation/Arrest #:", "").trim();
              temp_offenseDate = detailsParts[2].replace("Ofs Dt :", "").trim();
            }

            const charge = {
              count: temp_count,
              statute: temp_statute,
              charge: temp_charge,
              severity: temp_severity,
              offenseDate: temp_offenseDate,
              citationArrestNumbers: temp_citationArrestNumbers,
              otnNumbers: temp_otnNumbers,
              plea: temp_plea,
              dispositions: [disposition],
              dispositionDates: [dispositionDate],
              sentencing: temp_sentencing,
              offenseNotes: temp_offenseNotes,
              isExpungeable: false,
            }

            charges.push(charge);
          }
        });
      }
    );
    return charges;
  }

  async getTypeSpecificFactors() {
    const entries = await this.docketService.getDocketEntries();
    const dismissalStatus = await this.docketService.checkDismissalWithPrejudice(entries);
    const deferralStatus = await this.docketService.checkDeferredAcceptance(entries);
    
    return {
        withPrejudice: dismissalStatus.withPrejudice,
        deferredAcceptance: deferralStatus.deferredAcceptance
    };
  }

  getAdditionalDetails() {
    // Add any case-type specific details here
    return {
      // For example:
      specificInfo: "This is specific to PC cases",
    };
  }


  updateUI(charges, overallExpungeabilityStatus) {
    this.removeExistingExpungeabilityColumn();

    const chargesTable = $("table.iceDatTbl.data:contains('Offense Details')");
    chargesTable.find("tr:first").append("<th>Expungeability</th>");
    chargesTable.find("tr:not(:first)").each((index, row) => {
      const charge = charges[index];
      let bgColor, text;

      switch (charge.isExpungeable.status) {
        case "Expungeable":
          bgColor = "lightgreen";
          text = "Expungeable";
          break;
        case "Possibly Expungeable":
          bgColor = "darkorange";
          text = "Possibly Expungeable";
          break;
        case "Not Expungeable":
          bgColor = "lightcoral";
          text = "Not Expungeable";
          break;
        default:
          bgColor = "rgb(255, 193, 7)";
          text = charge.isExpungeable.status;
      }

      $(row).append(
        utils.createTooltipCell(text, bgColor, charge.isExpungeable.explanation)
      );
    });

    // Initialize tooltips
    this.initTooltips();
  }
}

// FFC Case Processor
class FFCCaseProcessor extends CaseProcessor {
  async getCharges() {
    const charges = [];
    $("table.iceDatTbl.data:contains('Offense Details')").each(
      (index, table) => {
        const $rows = $(table).find("tr");
        $rows.each((rowIndex, row) => {
          if (rowIndex === 0) return; // Skip header row

          const $cells = $(row).find("td");
          if ($cells.length >= 6) {
            const offenseDetailsHTML = $cells.eq(1).html();
            const detailsParts = offenseDetailsHTML.split("<br>");
            let statuteWithDescription = detailsParts;
            if (detailsParts.length > 1) {
              statuteWithDescription = detailsParts[0].split(" - ");
            }

            const dispositionWithDate = $cells.eq(3).text().trim();
            const dispositionParts = dispositionWithDate.split("-");
            const disposition = dispositionParts[0].trim();
            const dispositionDate = dispositionParts[1]
              ? dispositionParts[1].trim()
              : "";

            const charge = {
              count: $cells.eq(0).text().trim(),
              statute: statuteWithDescription[0] || "",
              charge: statuteWithDescription[1] || "",
              severity: detailsParts[1].replace("Severity:", "").trim(),
              offenseDate: (detailsParts[2] || "")
                .replace("Ofs Dt :", "")
                .trim(),
              citationArrestNumbers: (detailsParts[3] || "")
                .replace("Citation/Arrest #:", "")
                .trim(),
              plea: $cells.eq(2).text().trim(),
              dispositions: [disposition],
              dispositionDates: [dispositionDate],
              sentencing: $cells.eq(4).text().trim(),
              offenseNotes: $cells.eq(5).text().trim(),
              isExpungeable: false,
            };
            charges.push(charge);
          }
        });
      }
    );
    return charges;
  }

  checkNolleProsequi(docket) {
    return docket.some((record) => {
      const docketTextLower = record.docket.text.toLowerCase();
      return (
        docketTextLower.includes(
          "ord/nolle-prosequimotion for nolle prosequi with prejudice"
        ) && !docketTextLower.includes("den")
      );
    });
  }

  checkdeferredAcceptance(docket) {
    return docket.some((record) => {
      const docketTextLower = record.docket.text.toLowerCase();
      return docketTextLower.includes(
        "order granting motion for deferred acceptance of"
      );
    });
  }

  async getAdditionalFactors() {
    const docket = await this.getPCDocket();
    const withPrejudice = this.checkNolleProsequi(docket);
    //console.log(`docket: ${JSON.stringify(docket)}`);
    const deferredAcceptance = this.checkdeferredAcceptance(docket);
    return { withPrejudice, deferredAcceptance };
  }

  getAdditionalDetails() {
    // Add any case-type specific details here
    return {
      // For example:
      specificInfo: "This is specific to FFC cases",
    };
  }

  async getPCDocket() {
    const docketTable = $("tbody")
      .filter(function () {
        return (
          $(this)
            .find("tr:first th")
            .filter(function () {
              return $(this).text().trim() === "Docket";
            }).length > 0
        );
      })
      .first();

    const courtRecords = [];

    docketTable.find("tr:not(:first-child)").each((index, row) => {
      const cells = $(row).find("td");
      const record = {
        docketNumber: $(cells[0]).text().trim(),
        date: $(cells[1]).text().trim(),
        defendant: $(cells[3]).text().trim(),
        party: $(cells[4]).text().trim(),
        docket: {
          text: $(cells[2]).text().trim(),
          documentLinks: [],
        },
      };

      $(cells[2])
        .find("img")
        .each((index, link) => {
          const onclickAttr = $(link).attr("onclick");
          const docMatch = onclickAttr.match(
            /documentSelection\('([^']+)', '([^']+)'/
          );
          if (docMatch) {
            record.docket.documentLinks.push({
              documentId: docMatch[1],
              documentType: docMatch[2],
              src: $(link).attr("src"),
            });
          }
        });

      courtRecords.push(record);
    });
    return courtRecords;
  }

  updateUI(charges, overallExpungeabilityStatus) {
    this.removeExistingExpungeabilityColumn();

    const chargesTable = $("table.iceDatTbl.data:contains('Offense Details')");
    chargesTable.find("tr:first").append("<th>Expungeability</th>");
    chargesTable.find("tr:not(:first)").each((index, row) => {
      const charge = charges[index];
      let bgColor, text;

      switch (charge.isExpungeable.status) {
        case "Expungeable":
          bgColor = "lightgreen";
          text = "Expungeable";
          break;
        case "Possibly Expungeable":
          bgColor = "darkorange";
          text = "Possibly Expungeable";
          break;
        case "Not Expungeable":
          bgColor = "lightcoral";
          text = "Not Expungeable";
          break;
        default:
          bgColor = "rgb(255, 193, 7)";
          text = charge.isExpungeable.status;
      }

      $(row).append(
        utils.createTooltipCell(text, bgColor, charge.isExpungeable.explanation)
      );
    });

    // Initialize tooltips
    this.initTooltips();
  }
}

// DCC Case Processor
class DCCCaseProcessor extends CaseProcessor {
  async getCharges() {
    const charges = [];
    $("table.iceDatTbl.data:contains('COUNT:')").each((index, table) => {
      const $table = $(table);
      const count = $table
        .find("th")
        .text()
        .trim()
        .replace("COUNT:", "")
        .trim();
      const $nextTable = $table.next("table");

      const charge = {
        count: count,
        severity: $nextTable.find("tr:eq(0) td:eq(0)").text().trim(),
        statute: $nextTable.find("tr:eq(0) td:eq(1)").text().trim(),
        charge: $nextTable.find("tr:eq(0) td:eq(2)").text().trim(),
        offenseDate: $nextTable
          .find("tr:eq(1) td:eq(1)")
          .text()
          .trim()
          .replace("Vio Dt:", "")
          .trim(),
        citationArrestNumbers: $nextTable
          .find("tr:eq(2) td:eq(1)")
          .text()
          .trim()
          .replace("Citation/Arrest #:", "")
          .trim(),
        plea: "",
        dispositions: [],
        dispositionDates: [],
        isExpungeable: false,
      };

      const $dispositionTable = $nextTable.next("table");
      $dispositionTable.find("tr").each((i, row) => {
        const $cells = $(row).find("td");
        if ($cells.length >= 2) {
          const label = $cells.eq(0).text().trim();
          const value = $cells.eq(1).text().trim();
          if (label === "Plea:") {
            charge.plea = value;
          } else if (label === "Disposition:") {
            charge.dispositions.push(value);
            charge.dispositionDates.push($cells.eq(2).text().trim());
          }
        }
      });

      charges.push(charge);
    });

    return charges;
  }

  // async getAdditionalFactors() {
  //   // Add any DCC-specific factors here if needed
  //   return {};
  // }
  
  async getTypeSpecificFactors() {
    const entries = await this.docketService.getDocketEntries();
    const dismissalStatus = await this.docketService.checkDismissalWithPrejudice(entries);
    const deferralStatus = await this.docketService.checkDeferredAcceptance(entries);
    
    return {
        withPrejudice: dismissalStatus.withPrejudice,
        deferredAcceptance: deferralStatus.deferredAcceptance
    };
  }

  getAdditionalDetails() {
    // Add any case-type specific details here
    return {
      // For example:
      specificInfo: "This is specific to DCC cases",
    };
  }

  updateUI(charges, overallExpungeabilityStatus) {
    charges.forEach((charge, index) => {
      const $countTable = $(
        `table.iceDatTbl.data:contains('COUNT: ${charge.count}')`
      );
      const $chargeTable = $countTable.next("table");

      $countTable.find("span[data-expungeability]").remove();

      let bgColor, text;
      switch (charge.isExpungeable.status) {
        case "Expungeable":
          bgColor = "lightgreen";
          text = "Expungeable";
          break;
        case "Possibly Expungeable":
          bgColor = "darkorange";
          text = "Possibly Expungeable";
          break;
        case "Not Expungeable":
          bgColor = "lightcoral";
          text = "Not Expungeable";
          break;
        default:
          bgColor = "rgb(255, 193, 7)";
          text = charge.isExpungeable.status;
      }

      $countTable.find("th").append(`
                <span style="float: right; background-color: ${bgColor}; padding: 2px 5px; border-radius: 3px;" 
                      data-expungeability data-bs-toggle="tooltip" data-placement="top" 
                      title="${charge.isExpungeable.explanation}">
                    ${text}
                </span>
            `);
    });

    // Initialize tooltips
    this.initTooltips();
  }
}

// DTA Case Processor
class DTACaseProcessor extends CaseProcessor {
  async getCharges() {
    const charges = [];
    const violationsTable = $("table.iceDatTbl.data:contains('Violation')").eq(
      0
    );

    violationsTable.find("tr:gt(0)").each((index, row) => {
      const $cells = $(row).find("td");
      if ($cells.length >= 11) {
        const charge = {
          count: this.safeText($cells.eq(0)),
          severity: "Misdemeanor",
          statute: this.safeText($cells.eq(1)),
          charge: this.safeText($cells.eq(2)),
          offenseDate: this.safeText($cells.eq(3)),
          specialCourtsEligibility: this.safeText($cells.eq(4)),
          dispositionCode: this.safeText($cells.eq(5)),
          dispositions: [this.safeText($cells.eq(6))],
          dispositionDates: [this.safeText($cells.eq(7))],
          sentenceCode: this.safeText($cells.eq(8)),
          sentenceDescription: this.safeText($cells.eq(9)),
          sentenceLength: this.safeText($cells.eq(10)),
          isExpungeable: false,
        };
        charges.push(charge);
      }
    });

    return charges;
  }

  safeText($element) {
    return $element && $element.text() ? $element.text().trim() : "";
  }

  async getAdditionalFactors() {
    // Add any case-type specific details here
    const docket = await this.getDTADocket();
    // Temporary code to return docket for inspection
    //return { docket };\
    const dismissedOnOralMotionData = this.checkDismissedOnOralMotion(docket)
    const dismissedOnOralMotion = dismissedOnOralMotionData.dismissalFound;
    const dismissalDate = dismissedOnOralMotionData.dismissalDate;
    return { dismissedOnOralMotion, dismissalDate };
    //return {};
  }

  getAdditionalDetails() {
    return {
      specificInfo: "This is specific to DTA cases",
    };
  }

  async getDTADocket() {
    const docketTable = $("tbody")
      .filter(function () {
        return (
          $(this)
            .find("tr:first th")
            .filter(function () {
              return $(this).text().trim() === "Docket";
            }).length > 0
        );
      })
      .first();

    const courtRecords = [];

    docketTable.find("tr:not(:first-child)").each((index, row) => {
      const cells = $(row).find("td");
      const record = {
        docketNumber: $(cells[0]).text().trim(),
        date: $(cells[1]).text().trim(),
        defendant: $(cells[3]).text().trim(),
        party: $(cells[4]).text().trim(),
        docket: {
          text: $(cells[2]).text().trim(),
          documentLinks: [],
        },
      };

      $(cells[2])
        .find("img")
        .each((index, link) => {
          const onclickAttr = $(link).attr("onclick");
          const docMatch = onclickAttr.match(
            /documentSelection\('([^']+)', '([^']+)'/
          );
          if (docMatch) {
            record.docket.documentLinks.push({
              documentId: docMatch[1],
              documentType: docMatch[2],
              src: $(link).attr("src"),
            });
          }
        });

      courtRecords.push(record);
    });

    return courtRecords;
  }

  checkDismissedOnOralMotion(docket) {
    // Find the record with docket text "Motion to Dismiss" and "orally entered by the state-plea"
    let motionToDismissRecord = null;
    let orderGrantingMotionRecord = null;

    motionToDismissRecord = docket.find(
      (record) =>
        record.docket.text.includes("Motion to Dismiss") &&
        record.docket.text.includes("orally entered by the state-plea")
    );

    // Find the record with docket text "Oral Order Motion Granted"
    orderGrantingMotionRecord = docket.find(
      (record) =>
        record.docket.text.includes("Oral Order Motion Granted")
    );
    // Print text of record with order granting motion
    console.log(`Order granting motion record: ${JSON.stringify(orderGrantingMotionRecord)}`);

    // Check if orderGrantingMotionRecord.docketNumber > motionToDismissRecord.docketNumber
    // (These are strings and need to be compared as numbers)
    const dismissalFound = (
        motionToDismissRecord &&
        orderGrantingMotionRecord &&
        parseInt(orderGrantingMotionRecord.docketNumber) >
          parseInt(motionToDismissRecord.docketNumber)
      );
    const dismissalDate = dismissalFound ? orderGrantingMotionRecord.date : null;

    return { dismissalFound, dismissalDate };

    // return (
    //   motionToDismissRecord &&
    //   orderGrantingMotionRecord &&
    //   parseInt(orderGrantingMotionRecord.docketNumber) >
    //     parseInt(motionToDismissRecord.docketNumber)
    // );
  }

  updateUI(charges, overallExpungeabilityStatus) {
    this.removeExistingExpungeabilityColumn();

    const violationsTable = $("table.iceDatTbl.data:contains('Violation')").eq(
      0
    );
    if (violationsTable.length === 0) {
      console.warn("Violations table not found for UI update");
      return;
    }

    violationsTable
      .find("tr:eq(0)")
      .append('<th rowspan="2">Expungeability</th>');

    let currentRow = 2;
    charges.forEach((charge, index) => {
      const $firstChargeRow = violationsTable.find(`tr:eq(${currentRow})`);
      if ($firstChargeRow.length > 0) {
        const chargeRowspan = $firstChargeRow.find("td:first").attr("rowspan");
        const rowspan = chargeRowspan ? parseInt(chargeRowspan) : 1;

        let bgColor, text;
        switch (charge.isExpungeable.status) {
          case "Expungeable":
            bgColor = "lightgreen";
            text = "Expungeable";
            break;
          case "Possibly Expungeable":
            bgColor = "darkorange";
            text = "Possibly Expungeable";
            break;
          case "Not Expungeable":
            bgColor = "lightcoral";
            text = "Not Expungeable";
            break;
          default:
            bgColor = "rgb(255, 193, 7)";
            text = charge.isExpungeable.status;
        }

        $firstChargeRow.append(
          utils.createTooltipCell(
            text,
            bgColor,
            charge.isExpungeable.explanation,
            `rowspan="${rowspan}"`
          )
        );

        currentRow += rowspan;
      } else {
        console.warn(`Row for charge ${index + 1} not found`);
      }
    });

    // Initialize tooltips
    this.initTooltips();
  }
}

/// DTI Case Processor
class DTICaseProcessor extends CaseProcessor {
  async getCharges() {
    const charges = [];
    const violationsTable = $("table.iceDatTbl.data:contains('Violation')").eq(
      0
    );

    violationsTable.find("tr:gt(1)").each((index, row) => {
      const $cells = $(row).find("td");
      if ($cells.length >= 11) {
        const charge = {
          count: this.safeText($cells.eq(0)),
          severity: "Violation",
          statute: this.safeText($cells.eq(1)),
          charge: this.safeText($cells.eq(2)),
          offenseDate: this.safeText($cells.eq(3)),
          specialCourtsEligibility: this.safeText($cells.eq(4)),
          dispositionCode: this.safeText($cells.eq(5)),
          dispositions: [this.safeText($cells.eq(6))],
          dispositionDates: [this.safeText($cells.eq(7))],
          sentenceCode: this.safeText($cells.eq(8)),
          sentenceDescription: this.safeText($cells.eq(9)),
          sentenceLength: this.safeText($cells.eq(10)),
          isExpungeable: false,
        };
        charges.push(charge);
      }
    });

    return charges;
  }

  safeText($element) {
    return $element && $element.text() ? $element.text().trim() : "";
  }

  async getAdditionalFactors() {
    return {};
  }

  updateUI(charges, overallExpungeabilityStatus) {
    this.removeExistingExpungeabilityColumn();

    const violationsTable = $("table.iceDatTbl.data:contains('Violation')").eq(
      0
    );
    if (violationsTable.length === 0) {
      console.warn("Violations table not found for UI update");
      return;
    }

    violationsTable
      .find("tr:eq(0)")
      .append('<th rowspan="2">Expungeability</th>');

    let currentRow = 2;
    charges.forEach((charge, index) => {
      const $firstChargeRow = violationsTable.find(`tr:eq(${currentRow})`);
      if ($firstChargeRow.length > 0) {
        const chargeRowspan = $firstChargeRow.find("td:first").attr("rowspan");
        const rowspan = chargeRowspan ? parseInt(chargeRowspan) : 1;

        let bgColor, text;
        switch (charge.isExpungeable.status) {
          case "Expungeable":
            bgColor = "lightgreen";
            text = "Expungeable";
            break;
          case "Possibly Expungeable":
            bgColor = "darkorange";
            text = "Possibly Expungeable";
            break;
          case "Not Expungeable":
            bgColor = "lightcoral";
            text = "Not Expungeable";
            break;
          default:
            bgColor = "rgb(255, 193, 7)";
            text = charge.isExpungeable.status;
        }

        $firstChargeRow.append(
          utils.createTooltipCell(
            text,
            bgColor,
            charge.isExpungeable.explanation,
            `rowspan="${rowspan}"`
          )
        );

        currentRow += rowspan;
      } else {
        console.warn(`Row for charge ${index + 1} not found`);
      }
    });

    // Initialize tooltips
    this.initTooltips();
  }
}

// Case Processor Factory
class CaseProcessorFactory {
  static createProcessor() {
    let caseId
    try {
        ({ caseId } = utils.extractCaseInfo());
    } catch (error) {
        // User tries to check expungeability before searching for a case
        utils.showDialog(
            "Case Record Not Recognized",
            `This page does not appear to be a case record.`
        );
        window.__suppressErrorHandlerTwice = true;
        return null;
    }
    

    // Determine case type based on case ID
    if (caseId.includes("CPC")) {
      return new CPCCaseProcessor();
    } else if (caseId.includes("PC")) {
      return new PCCaseProcessor();
    } else if (caseId.includes("FFC")) {
      return new FFCCaseProcessor();
    } else if (caseId.includes("DTC")) {
      return new DTCCaseProcessor();
    } else if (caseId.includes("DCW")) {
      return new DCWCaseProcessor();
    } else if (caseId.includes("DCC")) {
      return new DCCCaseProcessor();
    } else if (caseId.includes("DTA")) {
      return new DTACaseProcessor();
    } else if (caseId.includes("DTI")) {
      return new DTICaseProcessor();
    } else {
      const formElement = document.querySelector("form");
      const caseInfoElement = $(
        ".iceDatTbl,.data:first > tbody > tr > td"
      ).first();
      const caseInfo = caseInfoElement.text() || "";
      if (
        formElement.action.includes("CaseSearch") &&
        caseInfo.includes("Case ID:")
      ) {
        // User tries to check expungeability of unsupported case type
        console.log(`Case description value: ${caseInfoElement}`);
        utils.showDialog(
          "Unsupported Case Type",
          `This case type is not currently supported.`
        );
      } else if (
        formElement.action.includes("CaseSearch") &&
        caseInfo.includes("cases found")
      ) {
        // User tries to check expungeability on search results page
        utils.showDialog(
          "Please Select a Case",
          `Cannot check expungeability from the search results page. Please click on a case and try again.`
        );
      } else {
        // User tries to check expungeability on an unknown page
        utils.showDialog(
          "Case Record Not Recognized",
          `This page does not appear to be a case record.`
        );
      }
      window.__suppressErrorHandlerTwice = true;
      return null;
      //throw new Error(`Unknown case type for case ID: ${caseId}`);
    }
  }
}

/////////////////////////// Docket Analysis Service ///////////////////////////
class DocketService {
  constructor() {
    this.initialized = false;
  }

  // Core initialization and parsing
  async initialize() {
    if (this.initialized) {
      return;
    }

    this.docketTable = $("tbody")
      .filter(function () {
        return (
          $(this)
            .find("tr:first th")
            .filter(function () {
              return $(this).text().trim() === "Docket";
            }).length > 0
        );
      })
      .first();

    if (!this.docketTable.length) {
      throw new Error("Docket table not found");
    }

    this.initialized = true;
  }

  // Main method to get parsed docket entries
  async getDocketEntries() {
    await this.initialize();
    return this.parseDocketTable();
  }

  // Private parsing methods
  parseDocketTable() {
    const entries = [];
    this.docketTable.find("tr:not(:first-child)").each((index, row) => {
      const cells = $(row).find("td");
      const entry = this.parseDocketRow(cells);
      if (entry) {
        entries.push(entry);
      }
    });
    return entries;
  }

  parseDocketRow(cells) {
    if (!cells || cells.length < 5) {
      return null;
    }

    const documentLinks = [];
    $(cells[2])
      .find("img")
      .each((index, link) => {
        const onclickAttr = $(link).attr("onclick");
        const docMatch = onclickAttr.match(
          /documentSelection\('([^']+)', '([^']+)'/
        );
        if (docMatch) {
          documentLinks.push({
            documentId: docMatch[1],
            documentType: docMatch[2],
            imageSource: $(link).attr("src"),
          });
        }
      });

    // console.log('Debugging docket entry: ', $(cells[0]).text().trim());
    // console.log('Date cell: ', $(cells[1]).text().trim());
    // console.log('Parsed date: ', new Date($(cells[1]).text().trim()));

    return {
      entryNumber: $(cells[0]).text().trim(),
      date: new Date($(cells[1]).text().trim()),
      docketText: $(cells[2]).html().replace(/<img[^>]*>/g, ''),
      defendant: $(cells[3]).text().trim(), 
      party: $(cells[4]).text().trim(),
      documentLinks: documentLinks,
    };
  }

  // Analysis utilities
  // Warrant analysis patterns
  static TYPE_PATTERNS = {
    arrest: {
        pattern: /bench warrant|bw issued|arrest warrant|warrant of arrest|WOA/i,
        type: 'arrest'
    },
    penal: {
        pattern: /penal summons/i,
        type: 'penal summons'
    }
  };

  static ACTION_PATTERNS = {
    execution: {
      pattern: /executed|execution|exec /i,
      action: 'execution'
  },
    issue: {
        pattern: /issued|ordered|granted/i,
        action: 'issue'
    },
    recall: {
        pattern: /recalled|quashed|returned/i,
        action: 'recall'
    },
    service: {
        pattern: /served|service/i,
        action: 'service'
    },
    set_bail: {
        pattern: /bail set|bail amount/i,
        action: 'bail set'
    }
  };

  analyzeWarrantText(text) {
    const analysis = {
        isWarrantRelated: false,
        type: null,
        action: null,
        bailAmount: null,
    };

    // Check for warrant type
    for (const [key, {pattern, type}] of Object.entries(DocketService.TYPE_PATTERNS)) {
        if (pattern.test(text)) {
            analysis.isWarrantRelated = true;
            analysis.type = type;
            
            // Extract bail amount
            const bailMatch = text.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
            if (bailMatch) {
                analysis.bailAmount = bailMatch[1];
            }
        }
    }

    // Separate check for action type (in descending order of priority)
    for (const [key, {pattern, action}] of Object.entries(DocketService.ACTION_PATTERNS)) {
        if (pattern.test(text)) {
            analysis.action = action;
            break;
        }
    }
    // Set action to "bail set" if bail amount is found (or append "bail set"
    // to existing action if it's already set)
    if (analysis.bailAmount) {
      if (!analysis.action) {
        analysis.action = 'bail set';
      } else if (analysis.action !== 'bail set') {
        analysis.action += '; bail set';
      }
    }

    return analysis;
  }

  // Main warrant analysis method
  async analyzeWarrantStatus(entries = null) {
    if (!entries) {
      entries = await this.getDocketEntries();
    }

    const warrantResults = {
      hasOutstandingWarrant: false,
      warrantEntries: [],
      latestWarrantDate: null,
      latestRecallDate: null,
      latestBailAmount: null,
      explanation: ""
  };

    // Find and categorize relevant entries
    this.findWarrantRelatedEntries(entries, warrantResults);

    // Set the latest dates
    //this.determineWarrantDates(warrantResults);

    // Analyze status and set explanation
    this.determineWarrantStatus(warrantResults);

    return warrantResults;
  }

  // Find entries and enrich them with warrant analysis
  findWarrantRelatedEntries(entries, results) {
    // Find all warrant-related entries and enrich them with analysis
    results.warrantEntries = entries
        .map(entry => {
            const warrantAnalysis = this.analyzeWarrantText(entry.docketText);
            if (warrantAnalysis.isWarrantRelated) {
                return {
                    ...entry,
                    warrantType: warrantAnalysis.type,
                    warrantAction: warrantAnalysis.action,
                    warrantBailAmount: warrantAnalysis.bailAmount
                };
            }
            return null;
        })
        .filter(entry => entry !== null);

    // Sort by date (newest first)
    results.warrantEntries.sort((a, b) => b.date - a.date);

    // Set latest dates based on actions
    const latestWarrant = results.warrantEntries.find(entry => entry.warrantAction === 'issue');
    const latestRecall = results.warrantEntries.find(entry => entry.warrantAction === 'recall');
    const latestBailAmount = results.warrantEntries.find(entry => entry.warrantAction === 'bail set');
    

    if (latestWarrant) {
        results.latestWarrantDate = latestWarrant.date;
    }
    if (latestRecall) {
        results.latestRecallDate = latestRecall.date;
    }
    if (latestBailAmount) {
        results.latestBailAmount = latestBailAmount.warrantBailAmount;
    }
  }

  // Helper method to determine final warrant status
  determineWarrantStatus(results) {
    if (results.warrantEntries.length === 0) {
        results.explanation = "No warrant entries found in docket.";
        return;
    }

    // Get all executions and recalls
    const terminatingActions = results.warrantEntries.filter(entry => 
      entry.warrantAction?.includes('recall') || entry.warrantAction?.includes('execution')
    );

    // Find the most recent warrant issuance
    const latestWarrant = results.warrantEntries.find(entry => entry.warrantAction === 'issue');
    
    if (!latestWarrant) {
        // No warrant issuance found, but check if there are execution/recall entries
        if (terminatingActions.length > 0) {
            // Sort by date to get the most recent
            terminatingActions.sort((a, b) => b.date - a.date);
            const latestAction = terminatingActions[0];
            
            results.hasOutstandingWarrant = false;
            results.explanation = 
                `Found warrant ${latestAction.warrantAction} on ${latestAction.date.toLocaleDateString()} ` +
                `but no corresponding issuance entry. ` +
                `${latestAction.warrantbailAmount ? 
                    `(Bail amount: $${latestAction.warrantbailAmount})` : 
                    ''}`;               
            return;
        }
        
        results.explanation = "No warrant entries found in docket.";
        return;
    }

    // Check for any recall or execution after the latest issuance
    const subsequentActions = terminatingActions.filter(entry => 
        entry.date > latestWarrant.date
    );

    // Sort by date if there are multiple actions
    subsequentActions.sort((a, b) => b.date - a.date);
    const latestAction = subsequentActions[0];

    if (latestAction) {
        // Warrant was recalled or executed
        results.hasOutstandingWarrant = false;
        results.explanation = 
            `Warrant issued on ${latestWarrant.date.toLocaleDateString()} was ` +
            `${latestAction.warrantAction === 'recall' ? 'recalled' : 'executed'} ` +
            `on ${latestAction.date.toLocaleDateString()}.` +
            `${latestWarrant.warrantbailAmount ? 
                ` (Bail was set at $${latestWarrant.warrantbailAmount})` : 
                ''}`;
    } else {
        // Warrant is still outstanding
        results.hasOutstandingWarrant = true;
        results.explanation = 
            `${latestWarrant.warrantType.charAt(0).toUpperCase() + latestWarrant.warrantType.slice(1)} warrant ` +
            `issued on ${latestWarrant.date.toLocaleDateString()} ` +
            `${latestWarrant.warrantbailAmount ? 
                `with bail set at $${latestWarrant.warrantbailAmount} ` : 
                ''}` +
            `remains outstanding.`;
    }
  }

  async checkDismissalWithPrejudice(entries = null) {
    if (!entries) {
      entries = await this.getDocketEntries();
    }

    const dismissalEntry = entries.find((entry) => {
      const docketTextLower = entry.docketText.toLowerCase();
      return (
        docketTextLower.includes(
          "ord/nolle-prosequimotion for nolle prosequi with prejudice"
        ) && !docketTextLower.includes("den")
      );
    });

    return {
      withPrejudice: Boolean(dismissalEntry),
      dismissalDate: dismissalEntry ? dismissalEntry.date : null,
      dismissalText: dismissalEntry ? dismissalEntry.docketText : null,
    };
  }

  async checkDeferredAcceptance(entries = null) {
    if (!entries) {
      entries = await this.getDocketEntries();
    }

    const deferralEntry = entries.find((entry) => {
      const docketTextLower = entry.docketText.toLowerCase();
      return docketTextLower.includes(
        "order granting motion for deferred acceptance of"
      );
    });

    return {
      deferredAcceptance: Boolean(deferralEntry),
      deferralDate: deferralEntry ? deferralEntry.date : null,
      deferralText: deferralEntry ? deferralEntry.docketText : null,
    };
  }
}

////////////////////////////////////////////////////////////////////////////////


// Main processing function
async function processAllCases() {
  try {
    const cases = await getCases(); // Assuming this function exists and works as expected
    console.log("Cases obtained:", cases);

    $(document).ready(async function () {
      const processor = CaseProcessorFactory.createProcessor();
      await processor.process();
    });
  } catch (error) {
    console.error("Failed to process cases:", error);
  }
}
