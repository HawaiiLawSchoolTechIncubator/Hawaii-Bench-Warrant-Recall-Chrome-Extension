/*
Adds case information from the current case on the page
*/

console.log("Content_Script - add_case_script.js");
//Add Jquery
var el = document.createElement('script');
el.src = chrome.runtime.getURL("libs/jquery-3.6.3.min.js");
document.body.appendChild(el);

console.log($('title').text());

var temp = $(".iceDatTbl,.data:first > tbody > tr > td")[0];
var caseinfo = $(temp).text()
var caseid = caseinfo.slice(9,24);
var case_name = caseinfo.slice(27,caseinfo.indexOf("Type:"));
console.log("Case Information:");
console.log(caseid);
console.log(case_name);


chrome.storage.local.get(null, function(items) {
    
    console.log("Items:");
    console.dir(items);

    if('cases' in items){
        //The cases key already exists
        console.log("Cases Already Exist");
        var cases = items['cases'];
    }else{
        var cases = [];
    }
    console.dir(cases);


    var obj2 = {};
    obj2['CaseNumber']=caseid;
    obj2['CaseName']=case_name;
    cases.push(obj2);
    items['cases'] = cases;
    chrome.storage.local.set(items, null);
    chrome.storage.local.get(null, function(items) {
        console.dir(items);
    });
        
});	