/*************************************************************************
 * TBLogger (JavaScript XPCOM component)
 *
 * Allows loglevel-based logging to different logging mechanisms.
 *
 *************************************************************************/

// Module specific constants
const kMODULE_NAME = "Torbutton Logger";
const kMODULE_CONTRACTID = "@torproject.org/torbutton-logger;1";
const kMODULE_CID = Components.ID("f36d72c9-9718-4134-b550-e109638331d7");

const Cr = Components.results;
const Cc = Components.classes;
const Ci = Components.interfaces;

function TorbuttonLogger() {
    this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
    this.loglevel = this.prefs.getIntPref("extensions.torbutton.loglevel");
    this.logmethod = this.prefs.getIntPref("extensions.torbutton.logmethod");

    try {
        var logMngr = Components.classes["@mozmonkey.com/debuglogger/manager;1"]
            .getService(Components.interfaces.nsIDebugLoggerManager); 
        this._debuglog = logMngr.registerLogger("torbutton");
    } catch (exErr) {
        this._debuglog = false;
    }
    this._console = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);

    // Register observer
    var pref_service = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranchInternal);
    this._branch = pref_service.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    this._branch.addObserver("", this, false);

    // This JSObject is exported directly to chrome
    this.wrappedJSObject = this;
    dump("Torbutton Logger component initialized\n");
}

/**
 * JS XPCOM component registration goop:
 *
 * Everything below is boring boilerplate and can probably be ignored.
 */

const nsISupports = Components.interfaces.nsISupports;
const nsIClassInfo = Components.interfaces.nsIClassInfo;
const nsIComponentRegistrar = Components.interfaces.nsIComponentRegistrar;
const nsIObserverService = Components.interfaces.nsIObserverService;

TorbuttonLogger.prototype =
{
  QueryInterface: function(iid)
  {
    if (!iid.equals(nsIClassInfo) &&
        !iid.equals(nsISupports)) {
      Components.returnCode = Cr.NS_ERROR_NO_INTERFACE;
      return null;
    }
    return this;
  },

  wrappedJSObject: null,  // Initialized by constructor

  // make this an nsIClassInfo object
  flags: nsIClassInfo.DOM_OBJECT,

  // method of nsIClassInfo
  classDescription: "TorbuttonLogger",

  // method of nsIClassInfo
  getInterfaces: function(count) {
    var interfaceList = [nsIClassInfo];
    count.value = interfaceList.length;
    return interfaceList;
  },

  // method of nsIClassInfo
  getHelperForLanguage: function(count) { return null; },

  // error console log
  eclog: function(level, str) {
      var now = Date.now();
      str = "["+now+"] ("+level+"): "+str;
      switch(this.logmethod) {
          case 0: // stderr
              if(this.loglevel <= level) 
                  dump(str+"\n");
              break;
          default: // errorconsole
              if(this.loglevel <= level)
                  this._console.logStringMessage(str);
              break;
      }
  },

  log: function(level, str) {
      var now = Date.now();
      str = "["+now+"] ("+level+"): "+str;
      switch(this.logmethod) {
          case 2: // debuglogger
              if(this._debuglog) {
                  this._debuglog.log((6-level), str);
                  break;
              }
              // fallthrough
          case 0: // stderr
              if(this.loglevel <= level) 
                  dump(str+"\n");
              break;
          default:
              dump("Bad log method: "+this.logmethod);
          case 1: // errorconsole
              if(this.loglevel <= level)
                  this._console.logStringMessage(str);
              break;
      }
  },

  // Pref observer interface implementation

  // topic:   what event occurred
  // subject: what nsIPrefBranch we're observing
  // data:    which pref has been changed (relative to subject)
  observe: function(subject, topic, data)
  {
      if (topic != "nsPref:changed") return;
      switch (data) {
          case "extensions.torbutton.logmethod":
              this.logmethod = this.prefs.getIntPref("extensions.torbutton.logmethod");
              break;
          case "extensions.torbutton.loglevel":
              this.loglevel = this.prefs.getIntPref("extensions.torbutton.loglevel");
              break;
      }
  }
}

var TorbuttonLoggerInstance = null;
var TorbuttonLoggerFactory = new Object();

TorbuttonLoggerFactory.createInstance = function (outer, iid)
{
  if (outer != null) {
    Components.returnCode = Cr.NS_ERROR_NO_AGGREGATION;
    return null;
  }
  if (!iid.equals(nsIClassInfo) &&
      !iid.equals(nsISupports)) {
    Components.returnCode = Cr.NS_ERROR_NO_INTERFACE;
    return null;
  }
  if(TorbuttonLoggerInstance == null)
      TorbuttonLoggerInstance = new TorbuttonLogger();

  return TorbuttonLoggerInstance;
}

var TorbuttonLoggerModule = new Object();

TorbuttonLoggerModule.registerSelf = 
function (compMgr, fileSpec, location, type)
{
  compMgr = compMgr.QueryInterface(nsIComponentRegistrar);
  compMgr.registerFactoryLocation(kMODULE_CID,
                                  kMODULE_NAME,
                                  kMODULE_CONTRACTID,
                                  fileSpec, 
                                  location, 
                                  type);
}

TorbuttonLoggerModule.getClassObject = function (compMgr, cid, iid)
{
  if (cid.equals(kMODULE_CID))
    return TorbuttonLoggerFactory;


  Components.returnCode = Cr.NS_ERROR_NOT_REGISTERED;
  return null;
}

TorbuttonLoggerModule.canUnload = function (compMgr)
{
  return true;
}

function NSGetModule(compMgr, fileSpec)
{
  return TorbuttonLoggerModule;
}
