Components.utils.import("resource://gre/modules/Services.jsm");
var setCharPref = Services.prefs.setCharPref;
var setBoolPref = Services.prefs.setBoolPref;
setBoolPref("browser.dom.window.dump.enabled", true);
setCharPref("media.peerconnection.default_iceservers", "[]");
setBoolPref("media.peerconnection.use_document_iceservers", false);
setBoolPref("devtools.chrome.enabled", true);
setBoolPref("devtools.debugger.prompt-connection", false);
setBoolPref("devtools.debugger.remote-enabled", true);
setCharPref("media.volume_scale", "0");
setCharPref("loop.server", "http://localhost:4000");
