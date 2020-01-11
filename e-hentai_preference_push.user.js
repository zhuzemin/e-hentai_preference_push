// ==UserScript==
// @name        e-hentai Preference Push
// @namespace   e-hentai_preference_push
// @supportURL  https://github.com/zhuzemin
// @description e-hentai 偏好推送
// @include     https://exhentai.org/
// @include     https://e-hentai.org/
// @include     https://exhentai.org/?*
// @include     https://e-hentai.org/?*
// @include     https://exhentai.org/tag/*
// @include     https://e-hentai.org/tag/*
// @include     https://exhentai.org/g/*
// @include     https://e-hentai.org/g/*
// @version     1.1
// @grant       GM_xmlhttpRequest
// @grant         GM_registerMenuCommand
// @grant         GM_setValue
// @grant         GM_getValue
// @run-at      document-start
// @author      zhuzemin
// @license     Mozilla Public License 2.0; http://www.mozilla.org/MPL/2.0/
// @license     CC Attribution-ShareAlike 4.0 International; http://creativecommons.org/licenses/by-sa/4.0/
// @connect-src e-hentai.org
// @connect-src exhentai.org
// ==/UserScript==
var config = {
    'debug': false
}
var debug = config.debug ? console.log.bind(console)  : function () {
};

var hostname;
var ContentPane;
var ContentPaneChildNum;
var FilledChildNum;
var ObjectGalleryPage;
var ObjectGallery;
var VisitTags;
var FavTags;
var VisitLinks;
var BlackTags;
var DivCount;
class Gallery{
    constructor(href,other) {
        this.method = 'GET';
        this.url = href;
        this.headers = {
            'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey',
            'Accept': 'application/atom+xml,application/xml,text/xml',
            'Referer': window.location.href,
        };
        this.charset = 'text/plain;charset=utf8';
        this.other=other;
    }
}
class GalleryPage{
    constructor(keyword) {
        this.method = 'GET';
        this.url = "https://"+hostname+"/?page="+keyword;
        this.headers = {
            'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey',
            'Accept': 'application/atom+xml,application/xml,text/xml',
            'Referer': window.location.href,
        };
        this.charset = 'text/plain;charset=utf8';
        this.other=null;
    }
}

// prepare UserPrefs
setUserPref(
    'BlackTags',
    'multi-work series;translated;original;',
    'Set BlackTags',
    `These Tags will not be factor. split with ";". Example: "multi-work series;translated;original;"`,
    ','
);

function init() {
    debug("init");
    VisitTags={};
    VisitLinks=[];
    BlackTags="";
    try{
        VisitTags=JSON.parse(GM_getValue("VisitTags"));
        VisitLinks=GM_getValue("VisitLinks").split(",");
        BlackTags=GM_getValue("BlackTags");
    }catch(e){
        debug("Not VisitTags.");
    }
debug("BlackTags: "+BlackTags);
    if(window.location.href.match(/(https:\/\/e(-|x)hentai\.org\/g\/[\d\w]*\/[\d\w]*\/)/)!=null){
        if(!VisitLinks.includes(window.location.href)){
            VisitLinks.push(window.location.href);
            GM_setValue("VisitLinks",VisitLinks.toString());
            var taglist = document.querySelector('#taglist');
            var links=taglist.querySelectorAll("a");
            for(var link of links) {
                var tag = link.innerText;
                if(Object.keys(VisitTags).length>0){
                    var count=1;
                    for(var VisitTag of Object.keys(VisitTags)){
                        if(tag==VisitTag){
                            VisitTags[tag]+=1;
                            break;
                        }
                        else if(count==Object.keys(VisitTags).length){
                            VisitTags[tag]=1;
                        }
                        count++;
                    }
                }
                else{
                    VisitTags[tag]=1;
                }
            }
            GM_setValue("VisitTags",JSON.stringify(VisitTags));
        }
        debug("VisitTags: "+JSON.stringify(VisitTags));
    }
    else{
        CreateButton();
    }
}

function CreateButton(){
    var btn=document.createElement("button");
    btn.type="button";
    btn.onclick="";
    btn.innerHTML=`You may like`;
    btn.addEventListener('click',ShowRecommand);
    var p=document.querySelector("p.nopm");
    p.insertBefore(btn,null);
}

function  ShowRecommand() {
    debug("ShowRecommand");
    //window.location.href+="#E-Hentai_Display_Tag_with_thumb";
    FavTags=[];
    GetFavTag();
    debug(FavTags);
    CreateStyle();
    hostname=getLocation(window.location.href).hostname;
    var select=document.querySelector("select");
    var options=select.querySelectorAll("option");
    for(var option of options){
        var value=option.getAttribute("value");
        var selected=option.getAttribute("selected");
        if(value=="t"){
            if(selected=="selected"){
                break;
            }
            else{
                alert("Page will set to Thumbnail, then you click Button again.")
                window.location.href="https://"+hostname+"/?inline_set=dm_t";
            }
        }
    }
    ContentPane=document.querySelector("div.itg.gld");
    ContentPaneChildNum=ContentPane.childNodes.length;
    FilledChildNum=0;
    //clear ContentPane
    while (ContentPane.firstChild) {
        ContentPane.removeChild(ContentPane.firstChild);
    }
    FillPane();
}

function FillPane(TotalPage){
    var table=document.querySelector("table.ptt");
    var tds=table.querySelectorAll("td");
    var TotalPage=parseInt(tds[tds.length-2].firstChild.innerText);
            var RandomPage = Math.floor(Math.random() * (TotalPage+1 - 0));
            ObjectGalleryPage=new GalleryPage(RandomPage);
    request(ObjectGalleryPage,SearchGallery);
}

function GetGalleryTag(responseDetails,divs) {
    debug("GetGalleryTag");
    try{
        var div=divs[DivCount];
        var responseText=responseDetails.responseText;
        var dom = new DOMParser().parseFromString(responseText, "text/html");
        var taglist = dom.querySelector('#taglist');
        var links=taglist.querySelectorAll("a");
        var count=0;
        for(var link of links){
            var tag=link.innerText;
            for(var FavTag of FavTags) {
                if(count>=3||count==FavTags.length){
                    div.insertBefore(taglist, null);
                    ContentPane.insertBefore(div,null);
                    debug("Insert div");
                    count=0;
                    FilledChildNum++;
                    break;
                }
                else if (tag == FavTag.trim()) {
                    //debug("FavTag: " + FavTag);
                    link.parentNode.className +=" glowbox";
                    count++;
                }
            }
        }

    }
    catch(e){
        debug("Error: "+e);
    }
    if(FilledChildNum<ContentPaneChildNum) {
        if (DivCount < divs.length) {
            //for (var i = 0; i < divs.length; ++i) {
            //var div=divs[i];
            if (FilledChildNum == ContentPaneChildNum - 1) {
                debug("finish");
                return;
            }
            else if (FavTags.length == 0) {
                ContentPane.insertBefore(div, null);
                debug("Insert div");
                FilledChildNum++;
            }
            else {
                debug("DivCount: " + DivCount);
                var href = div.querySelector('a').href;
                ObjectGallery = new Gallery(href, divs);
                request(ObjectGallery, GetGalleryTag);
                DivCount++;
            }
        }
        else {
            FillPane();
        }
    }
}

function GetFavTag(){
    //convert object to array
    var sortable = [];
    for (var VisitTag in VisitTags) {
        sortable.push([VisitTag, VisitTags[VisitTag]]);
    }

    //sort by reverse
    sortable.sort(function(a, b) {
        return a[1] - b[1];
    }).reverse();

    //shuffle array
    var shuffle=function (sourceArray) {
        for (var i = 0; i < sourceArray.length - 1; i++) {
            var j = i + Math.floor(Math.random() * (sourceArray.length - i));

            var temp = sourceArray[j];
            sourceArray[j] = sourceArray[i];
            sourceArray[i] = temp;
        }
        return sourceArray;
    }

    //convert array to object
    var ArrayToObj=function (sortable){
        VisitTags={};
        sortable.forEach(function(item){
            VisitTags[item[0]]=item[1]
        })
        return VisitTags;
    }

    VisitTags=ArrayToObj(sortable);
    var count=0;
    for(var VisitTag of Object.keys(VisitTags)){
        if(VisitTags[VisitTag]==1){
            return;
        }
        if(!BlackTags.includes(VisitTag.trim())){
            FavTags.push(VisitTag);
        }
        if(count==Math.floor(Object.keys(VisitTags).length/3)) {
            //VisitTags too many, need shuffling
            if(VisitTags[VisitTag]>=Math.floor(Object.keys(VisitTags).length/3)){
                VisitTags=ArrayToObj(shuffle(sortable));
                GM_setValue("VisitTags",JSON.stringify(VisitTags));
            }
            return;
        }
        count++;
    }
}



function getLocation(href) {
    var l = document.createElement("a");
    l.href = href;
    return l;
}

function SearchGallery(responseDetails) {
    debug("SearchGallery");
    var responseText=responseDetails.responseText;
    //var href=responseText.match(/(https:\/\/e(-|x)hentai\.org\/g\/[\d\w]*\/[\d\w]*\/)/)[1];
    //debug("href: "+href);
    var dom = new DOMParser().parseFromString(responseText, "text/html");
    var CurrentContentPane=dom.querySelector('div.itg.gld');
    var divs = CurrentContentPane.querySelectorAll('div.gl1t');
    for(var div of divs){
        var backgroundPosition=div.querySelector("div.ir").style.backgroundPosition;
        if(!["0px -21px","0px -1px"].includes(backgroundPosition)){
            CurrentContentPane.removeChild(div);
        }
    }
    divs = CurrentContentPane.querySelectorAll('div.gl1t');
    debug("divs.length: "+divs.length);
    DivCount=0;
    var href = divs[DivCount].querySelector('a').href;
    ObjectGallery = new Gallery(href,divs);
    request(ObjectGallery,GetGalleryTag);
}

function request(object,func) {
    var retries = 10;
    GM_xmlhttpRequest({
        method: object.method,
        url: object.url,
        headers: object.headers,
        overrideMimeType: object.charset,
        //synchronous: true
        onload: function (responseDetails) {
            if (responseDetails.status != 200) {
                // retry
                if (retries--) {          // *** Recurse if we still have retries
                    setTimeout(request,2000);
                    return;
                }
            }
            //debug(responseDetails);
            //Dowork
            func(responseDetails,object.other);
        }
    })
}
function CreateStyle(){
    debug("Start: CreateStyle");
    var style=document.createElement("style");
    style.setAttribute("type","text/css");
    style.innerHTML=`
.glowbox {
     background: #4c4c4c; 
    //width: 400px;
    margin: 40px 0 0 40px;
    padding: 10px;
    -moz-box-shadow: 0 0 5px 5px #FFFF00;
    -webkit-box-shadow: 0 0 5px 5px #FFFF00;
    box-shadow: 0 0 5px 5px #FFFF00;
}
`;
    debug("Processing: CreateStyle");
    var head=document.querySelector("head");
    head.insertBefore(style,null);
    debug("End: CreateStyle");
}

// setting User Preferences
function setUserPref(varName, defaultVal, menuText, promtText, sep){
    GM_registerMenuCommand(menuText, function() {
        var val = prompt(promtText, GM_getValue(varName, defaultVal));
        if (val === null)  { return; }  // end execution if clicked CANCEL
        // prepare string of variables separated by the separator
        if (sep && val){
            var pat1 = new RegExp('\\s*' + sep + '+\\s*', 'g'); // trim space/s around separator & trim repeated separator
            var pat2 = new RegExp('(?:^' + sep + '+|' + sep + '+$)', 'g'); // trim starting & trailing separator
            //val = val.replace(pat1, sep).replace(pat2, '');
        }
        //val = val.replace(/\s{2,}/g, ' ').trim();    // remove multiple spaces and trim
        GM_setValue(varName, val);
        // Apply changes (immediately if there are no existing highlights, or upon reload to clear the old ones)
        //if(!document.body.querySelector(".THmo")) THmo_doHighlight(document.body);
        //else location.reload();
    });
}

if (document.body) init();
else window.addEventListener('DOMContentLoaded', init);

