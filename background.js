async function getTab() {
  let queryOptions = { active: true, currentWindow: true };
  let tabs = await chrome.tabs.query(queryOptions);
  if (tabs.length === 0) {
    throw new Error("No active tabs found");
  }
  return tabs[0];
}


//This checks to see if the URL is the overview page and then runs the script automatically without having the user click the button.
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // Check if the URL matches and the page has finished loading
  if (tab.url === "http://jimspss1.courts.state.hi.us:8080/eCourt/ECC/PartyNameSearch.iface" && changeInfo.status === 'complete') {
    // Inject the script
    console.log("Injecting Script");
    getTab().then(function(tab){
      chrome.scripting.executeScript({
          target : {tabId : tab.id},
          files: ["libs/jquery-3.6.3.min.js","overview.js","global_cases.js"]
        });
    
  })
  .catch((reason) => console.log("Error" + reason.message));
  }

  if (tab.url.includes("http://jimspss1.courts.state.hi.us:8080/eCourt/ECC") && changeInfo.status === 'complete') {
    // Inject the CSS
    console.log("Injecting CSS");
    injectCSS(tabId)
  }
});

//This listens for messages from popup.js which are checking to see if an individual case is expungeable and checking the overview page.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action == "check_expungeability"){
    //Checks to see if an individual case is eligible for expungement
    //This calls a file called "global_cases.js" which calls unified_cases to determine the case type (DTC, DCW, CPC, etc.) and process the case.
      console.log("Injecting Expungeability Content Script");
      getTab().then(function(tab){
          console.log("Tab Info:");
          console.log(tab);
          console.log("Read tab");
          console.log(tab.url);
          console.log("Read tab.url")
          chrome.scripting.executeScript({
              target : {tabId : tab.id},
              files: ["libs/jquery-3.6.3.min.js","global_cases.js","unified_cases.js","expungeable.js"]
            });
      })
      .catch((reason) => console.log("Error" + reason.message));
  } else if(request.action == "overview_page"){
    //If the call is for the overview page run the overview.js file.
      console.log("Injecting Overview Content Script");
      getTab().then(function(tab){
          chrome.scripting.executeScript({
          target : {tabId : tab.id},
          files: ["libs/jquery-3.6.3.min.js","overview.js","global_cases.js"]
        });
      })
      .catch((reason) => console.log("Error at line " + reason.lineNumber + ": " + reason.message));
  } else if(request.action === "injectCSS") {
    injectCSS(sender.tab.id);
    sendResponse({success: true});
    return true; // Indicates that the response is sent asynchronously
  }
});

let requestDetailsMap = new Map();

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.type === 'xmlhttprequest' && details.method === "POST") {
      console.log("AJAX request initiated:", details);
      console.log("Payload:", details.requestBody);
      // Store the request details for later use
      requestDetailsMap.set(details.requestId, details.requestBody);
    }
  },
  { urls: ["http://*.courts.state.hi.us/*"] },
  ["requestBody"]
);

chrome.webRequest.onCompleted.addListener(
  function(details) {
    if (details.type === 'xmlhttprequest' || details.type === 'sub_frame') {
      // console.log("AJAX request completed:", details);
      // console.log(details.url);
      
      // Retrieve the stored request body using the requestId
      const requestBody = requestDetailsMap.get(details.requestId);
      if (requestBody) {
        // console.log("Request Payload:", requestBody);


        if(requestBody.formData['ice.event.captured'][0].includes("results_page_scrolleridx")){
          console.log("Page Clicked");
          chrome.tabs.query({}, function(tabs) {
            tabs.forEach(function(tab) {
              if (tab.id === details.tabId && details.url == "http://jimspss1.courts.state.hi.us:8080/eCourt/ECC/PartyNameSearch.iface") {
                chrome.tabs.sendMessage(tab.id, { message: "ajax_complete", details: details,url: details.url});
              }
            });
          });
        }
        // Clean up the stored request body
        requestDetailsMap.delete(details.requestId);
      }
    }
  },
  { urls: ["http://*.courts.state.hi.us/*"] }
);

// Function to inject CSS
function injectCSS(tabId) {
  chrome.scripting.insertCSS({
    target: { tabId: tabId },
    files: ["dialog.css"]
  }).then(() => {
    console.log("CSS injected successfully into tab:", tabId);
  }).catch(err => {
    console.error("Error injecting CSS into tab", tabId, ":", err);
  });
}

