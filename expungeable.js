//Add Jquery
var el = document.createElement('script');
el.src = chrome.runtime.getURL("libs/jquery-3.6.3.min.js");
document.body.appendChild(el);

$(document).ready(function () {
    console.log($('title').text());

    
    processAllCases();
});

