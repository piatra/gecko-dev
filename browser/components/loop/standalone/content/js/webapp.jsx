/** @jsx React.DOM */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true, React */
/* jshint newcap:false */

var loop = loop || {};
loop.webapp = (function($, _, OT, mozL10n) {
  "use strict";

  loop.config = loop.config || {};
  loop.config.serverUrl = loop.config.serverUrl || "http://localhost:5000";

  var sharedModels = loop.shared.models,
      sharedViews = loop.shared.views,
      baseServerUrl = loop.config.serverUrl,
      DropdownMenuMixin = loop.shared.views.DropdownMenuMixin;

  /**
   * App router.
   * @type {loop.webapp.WebappRouter}
   */
  var router;

  /**
   * Default page view.
   */
  var DefaultView = sharedViews.BaseView.extend({
    template: _.template('<p data-l10n-id="welcome"></p>')
  });

  /**
   * Firefox promotion interstitial. Will display only to non-Firefox users.
   */
  var PromoteFirefoxView = React.createClass({
    propTypes: {
      helper: React.PropTypes.object.isRequired
    },

    render: function() {
      if (this.props.helper.isFirefox(navigator.userAgent)) {
        return <div />;
      }
      return (
        <div className="promote-firefox">
          <h3>{mozL10n.get("promote_firefox_hello_heading")}</h3>
          <p>
            <a className="btn btn-large btn-accept"
               href="https://www.mozilla.org/firefox/">
              {mozL10n.get("get_firefox_button")}
            </a>
          </p>
        </div>
      );
    }
  });

  /**
   * Expired call URL view.
   */
  var CallUrlExpiredView = React.createClass({
    propTypes: {
      helper: React.PropTypes.object.isRequired
    },

    render: function() {
      /* jshint ignore:start */
      return (
        <div className="expired-url-info">
          <div className="info-panel">
            <div className="firefox-logo" />
            <h1>{mozL10n.get("call_url_unavailable_notification_heading")}</h1>
            <h4>{mozL10n.get("call_url_unavailable_notification_message2")}</h4>
          </div>
          <PromoteFirefoxView helper={this.props.helper} />
        </div>
      );
      /* jshint ignore:end */
    }
  });

  var ConversationHeader = React.createClass({
    render: function() {
      var cx = React.addons.classSet;
      var conversationUrl = location.href;

      var urlCreationDateClasses = cx({
        "light-color-font": true,
        "call-url-date": true, /* Used as a handler in the tests */
        /*hidden until date is available*/
        "hide": !this.props.urlCreationDateString.length
      });

      var callUrlCreationDateString = mozL10n.get("call_url_creation_date_label", {
        "call_url_creation_date": this.props.urlCreationDateString
      });

      return (
        /* jshint ignore:start */
        <header className="standalone-header container-box">
          <h1 className="standalone-header-title">
            <strong>{mozL10n.get("brandShortname")}</strong> {mozL10n.get("clientShortname")}
          </h1>
          <div className="loop-logo" title="Firefox WebRTC! logo"></div>
          <h3 className="call-url">
            {conversationUrl}
          </h3>
          <h4 className={urlCreationDateClasses} >
            {callUrlCreationDateString}
          </h4>
        </header>
        /* jshint ignore:end */
      );
    }
  });

  var ConversationFooter = React.createClass({
    render: function() {
      return (
        <div className="standalone-footer container-box">
          <div title="Mozilla Logo" className="footer-logo"></div>
        </div>
      );
    }
  });

  /**
   * Conversation launcher view. A ConversationModel is associated and attached
   * as a `model` property.
   */
  var StartConversationView = React.createClass({
    /**
     * Constructor.
     *
     * Required options:
     * - {loop.shared.model.ConversationModel}    model    Conversation model.
     * - {loop.shared.views.NotificationListView} notifier Notifier component.
     *
     */
    mixins: [DropdownMenuMixin],

    getInitialProps: function() {
      return {
        showMenu: false,
        callFailed: false
      };
    },

    getInitialState: function() {
      return {
        urlCreationDateString: '',
        disableCallButton: false,
        callFailed: this.props.callFailed,
        errorSoundNotification: false,
        disableCallRetryButton: false,
        seenToS: localStorage.getItem("has-seen-tos")
      };
    },

    propTypes: {
      model: React.PropTypes.instanceOf(sharedModels.ConversationModel)
                                       .isRequired,
      // XXX Check more tightly here when we start injecting window.loop.*
      notifier: React.PropTypes.object.isRequired,
      client: React.PropTypes.object.isRequired
    },

    componentDidMount: function() {
      // Listen for events & hide dropdown menu if user clicks away
      this.props.model.listenTo(this.props.model, "call:error", this._onCallError);
      this.props.model.listenTo(this.props.model, "session:error",
                                this._onSessionError);
      this.props.client.requestCallUrlInfo(this.props.model.get("loopToken"),
                                           this._setConversationTimestamp);

      this._loadCallErrorSound();
      // XXX DOM element does not exist before React view gets instantiated
      // We should turn the notifier into a react component
      this.props.notifier.$el = $("#messages");
    },

    /**
     * Callback function for "call:error" event triggered on the
     * conversation model. Shows error message, plays error sound
     * and enables the call retry button
     *
     * @param {string} l10nErrorID - l10n id of error
     */
    _onCallError: function(l10nErrorId) {
      this.props.notifier.errorL10n(l10nErrorId);
      this.setState({
        // Display call failed error message
        callFailed: true,
        // Enable the retry button
        disableCallRetryButton: false
      });
      this.state.errorSoundNotification.play();
    },

    _onSessionError: function(error) {
      console.error(error);
      this.props.notifier.errorL10n("unable_retrieve_call_info");
    },

    _loadCallErrorSound: function() {
      var assetURL = location.origin + "/content/shared/sounds/call-failed.mp3";
      this.state.errorSoundNotification = new Audio(assetURL);
    },

    /**
     * Initiates the call.
     * Takes in a call type parameter "audio" or "audio-video" and returns
     * a function that initiates the call. React click handler requires a function
     * to be called when that event happenes.
     *
     * @param {string} User call type choice "audio" or "audio-video"
     */
    initiateOutgoingCall: function(callType) {
      return function() {
        this.props.model.set("selectedCallType", callType);
        this.setState({disableCallButton: true});
        this.props.model.setupOutgoingCall();
      }.bind(this);
    },

    /**
     * Attempt to make another call using the previously selected call type
     * */
    retryCall: function() {
      this.props.notifier.clear();
      this.setState({
        // Disable the retry button
        disableCallRetryButton: true,
        // Remove the call failed message
        callFailed: false
      });
      this.props.model.setupOutgoingCall();
    },

    _setConversationTimestamp: function(err, callUrlInfo) {
      if (err) {
        this.props.notifier.errorL10n("unable_retrieve_call_info");
      } else {
        var date = (new Date(callUrlInfo.urlCreationDate * 1000));
        var options = {year: "numeric", month: "long", day: "numeric"};
        var timestamp = date.toLocaleDateString(navigator.language, options);
        this.setState({urlCreationDateString: timestamp});
      }
    },

    componentWillUnmount: function() {
      localStorage.setItem("has-seen-tos", "true");
    },

    render: function() {
      var tos_link_name = mozL10n.get("terms_of_use_link_text");
      var privacy_notice_name = mozL10n.get("privacy_notice_link_text");

      var tosHTML = mozL10n.get("legal_text_and_links", {
        "terms_of_use_url": "<a target=_blank href='" +
          "https://accounts.firefox.com/legal/terms'>" + tos_link_name + "</a>",
        "privacy_notice_url": "<a target=_blank href='" +
          "https://www.mozilla.org/privacy/'>" + privacy_notice_name + "</a>"
      });
      var cx = React.addons.classSet;

      var tosClasses = cx({
        "terms-service": true,
        hide: (this.state.seenToS === "true")
      });
      var displayCallFailedMsgClasses = cx({
        "hide": !this.state.callFailed
      });
      var displayInitiateCallMsg = cx({
        "hide": this.state.callFailed,
        "standalone-call-btn-label": true
      });

      return (
        /* jshint ignore:start */
        <div className="container">
          <div className="container-box">

            <ConversationHeader
              urlCreationDateString={this.state.urlCreationDateString} />

            <p className={displayInitiateCallMsg}>
              {mozL10n.get("initiate_call_button_label2")}
            </p>

            <div className={displayCallFailedMsgClasses}>
              <div className="standalone-call-loading-failed"></div>
              <p className="standalone-call-btn-label">
                {mozL10n.get("generic_failure_title")} {mozL10n.get("generic_failure_no_reason2")}
              </p>
            </div>

            <div id="messages"></div>

            <ConversationViewCallBtn showMenu={this.state.showMenu}
                          initiateCall={this.initiateOutgoingCall}
                          disableBtn={this.state.disableCallButton}
                          showDropdownMenu={this.showDropdownMenu}
                          callFailed={this.state.callFailed} />

            <ConversationViewRetryBtn retryCall={this.retryCall}
                          disableRetryBtn={this.state.disableCallRetryBtn}
                          callFailed={this.state.callFailed} />

            <p className={tosClasses}
               dangerouslySetInnerHTML={{__html: tosHTML}}>
            </p>

          </div>

          <ConversationFooter />
        </div>
        /* jshint ignore:end */
      );
    }
  });

  var ConversationViewCallBtn = React.createClass({

    propTypes: {
      initiateCall: React.PropTypes.func.isRequired,
      disableBtn: React.PropTypes.bool.isRequired,
      showDropdownMenu: React.PropTypes.func.isRequired,
      showMenu: React.PropTypes.bool.isRequired
    },

    render: function() {
      var dropdownMenuClasses = React.addons.classSet({
        "native-dropdown-large-parent": true,
        "standalone-dropdown-menu": true,
        "visually-hidden": !this.props.showMenu
      });
      var callBtnClasses = React.addons.classSet({
        "btn-group": true,
        "hide": this.props.callFailed
      });
      return (
        /* jshint ignore:start */
        <div className={callBtnClasses}>
          <div className="flex-padding-1"></div>
          <div className="standalone-btn-chevron-menu-group">
            <div className="btn-group-chevron">
              <div className="btn-group">

                <button className="btn btn-large btn-accept"
                  onClick={this.props.initiateCall("audio-video")}
                  disabled={this.props.disableBtn}
                  title={mozL10n.get("initiate_audio_video_call_tooltip2")} >
                  <span className="standalone-call-btn-text">
                    {mozL10n.get("initiate_audio_video_call_button2")}
                  </span>
                  <span className="standalone-call-btn-video-icon"></span>
                </button>

                <div className="btn-chevron"
                  onClick={this.props.showDropdownMenu}>
                </div>

              </div>

              <ul className={dropdownMenuClasses}>
                <li>
                  {/* Button required for disabled state */}
                  <button className="start-audio-only-call"
                    onClick={this.props.initiateCall("audio")}
                    disabled={this.props.disableBtn} >
                    {mozL10n.get("initiate_audio_call_button2")}
                  </button>
                </li>
              </ul>

            </div>
          </div>
          <div className="flex-padding-1"></div>
        </div>
      );
    }
  });

  var ConversationViewRetryBtn = React.createClass({

    propTypes: {
      retryCall: React.PropTypes.func.isRequired,
      disableRetryBtn: React.PropTypes.bool.isRequired,
      callFailed: React.PropTypes.bool.isRequired
    },

    render: function() {
      var retryBtnClasses = React.addons.classSet({
        "btn-group": true,
        "hide": !this.props.callFailed
      });
      return (
        /* jshint ignore:start */
        <div className={retryBtnClasses}>
          <div className="flex-padding-1"></div>
          <button className="standalone-btn-retry-call btn-accept"
            disabled={this.props.disableRetryBtn}
            onClick={this.props.retryCall} >
            {mozL10n.get("retry_call_button")}
          </button>
          <div className="flex-padding-1"></div>
        </div>
        /* jshint ignore:end */
      );
    }
  });

  /**
   * Webapp Router.
   */
  var WebappRouter = loop.shared.router.BaseConversationRouter.extend({
    routes: {
      "":                    "defaultView",
      "unsupportedDevice":   "unsupportedDevice",
      "unsupportedBrowser":  "unsupportedBrowser",
      "call/expired":        "expired",
      "call/ongoing/:token": "loadConversation",
      "call/:token":         "initiate"
    },

    initialize: function(options) {
      this.helper = options.helper;
      if (!this.helper) {
        throw new Error("WebappRouter requires a helper object");
      }

      // Load default view
      this.loadView(new DefaultView());

      this.listenTo(this._conversation, "timeout", this._onTimeout);
    },

    _onSessionExpired: function() {
      this.navigate("/call/expired", {trigger: true});
    },

    /**
     * Starts the set up of a call, obtaining the required information from the
     * server.
     */
    setupOutgoingCall: function() {
      var loopToken = this._conversation.get("loopToken");
      if (!loopToken) {
        this._conversation.trigger("call:error", "missing_conversation_info");
      } else {
        var callType = this._conversation.get("selectedCallType");

        this._conversation.once("call:outgoing", this.startCall, this);

        this._client.requestCallInfo(this._conversation.get("loopToken"),
                                     callType, function(err, sessionData) {
          if (err) {
            switch (err.errno) {
              // loop-server sends 404 + INVALID_TOKEN (errno 105) whenever a token is
              // missing OR expired; we treat this information as if the url is always
              // expired.
              case 105:
                this._onSessionExpired();
                break;
              default:
                this._conversation.trigger("call:error", "missing_conversation_info");
                break;
            }
            return;
          }
          this._conversation.outgoing(sessionData);
        }.bind(this));
      }
    },

    /**
     * Actually starts the call.
     */
    startCall: function() {
      var loopToken = this._conversation.get("loopToken");
      if (!loopToken) {
        this._conversation.trigger("call:error", "missing_conversation_info");
      } else {
        this._setupWebSocketAndCallView(loopToken);
      }
    },

    /**
     * Used to set up the web socket connection and navigate to the
     * call view if appropriate.
     *
     * @param {string} loopToken The session token to use.
     */
    _setupWebSocketAndCallView: function(loopToken) {
      this._websocket = new loop.CallConnectionWebSocket({
        url: this._conversation.get("progressURL"),
        websocketToken: this._conversation.get("websocketToken"),
        callId: this._conversation.get("callId"),
      });
      this._websocket.promiseConnect().then(function() {
        this.navigate("call/ongoing/" + loopToken, {
          trigger: true
        });
      }.bind(this), function() {
        // XXX Not the ideal response, but bug 1047410 will be replacing
        // this by better "call failed" UI.
        this._conversation.trigger("call:error", "missing_converation_info");
        return;
      }.bind(this));

      this._websocket.on("progress", this._handleWebSocketProgress, this);
    },

    /**
     * Checks if the streams have been connected, and notifies the
     * websocket that the media is now connected.
     */
    _checkConnected: function() {
      // Check we've had both local and remote streams connected before
      // sending the media up message.
      if (this._conversation.streamsConnected()) {
        this._websocket.mediaUp();
      }
    },

    /**
     * Used to receive websocket progress and to determine how to handle
     * it if appropraite.
     */
    _handleWebSocketProgress: function(progressData) {
      if (progressData.state === "terminated") {
        // XXX Before adding more states here, the basic protocol messages to the
        // server need implementing on both the standalone and desktop side.
        // These are covered by bug 1045643, but also check the dependencies on
        // bug 1034041.
        //
        // Failure to do this will break desktop - standalone call setup. We're
        // ok to handle reject, as that is a specific message from the destkop via
        // the server.
        switch (progressData.reason) {
          case "reject":
            this._handleCallRejected();
        }
      }
    },

    /**
     * Handles call rejection.
     * XXX This should really display the call failed view - bug 1046959
     * will implement this.
     */
    _handleCallRejected: function() {
      this.endCall();
      this._conversation.trigger("call:error", "call_timeout_notification_text");
    },

    /**
     * @override {loop.shared.router.BaseConversationRouter.endCall}
     */
    endCall: function() {
      var route = "default";
      if (this._conversation.get("loopToken")) {
        route = "call/" + this._conversation.get("loopToken");
      }
      this.navigate(route, {trigger: true});
    },

    _onTimeout: function() {
      this._notifier.errorL10n("call_timeout_notification_text");
    },

    /**
     * Default entry point.
     */
    defaultView: function() {
      this.loadView(new DefaultView());
    },

    unsupportedDevice: function() {
      this.loadView(new sharedViews.UnsupportedDeviceView());
    },

    unsupportedBrowser: function() {
      this.loadView(new sharedViews.UnsupportedBrowserView());
    },

    expired: function() {
      this.loadReactComponent(CallUrlExpiredView({helper: this.helper}));
    },

    /**
     * Loads conversation launcher view, setting the received conversation token
     * to the current conversation model. If a session is currently established,
     * terminates it first.
     *
     * @param  {String} loopToken Loop conversation token.
     */
    initiate: function(loopToken) {
      // Check if a session is ongoing; if so, terminate it
      if (this._conversation.get("ongoing")) {
        this._conversation.endSession();
      }
      this._conversation.set("loopToken", loopToken);

      var startView = StartConversationView({
        model: this._conversation,
        notifier: this._notifier,
        client: this._client
      });
      this._conversation.on("call:outgoing:setup", this.setupOutgoingCall, this);
      this._conversation.once("change:publishedStream", this._checkConnected, this);
      this._conversation.once("change:subscribedStream", this._checkConnected, this);
      this.loadReactComponent(startView);
    },

    /**
     * Loads conversation establishment view.
     *
     */
    loadConversation: function(loopToken) {
      if (!this._conversation.isSessionReady()) {
        // User has loaded this url directly, actually setup the call.
        return this.navigate("call/" + loopToken, {trigger: true});
      }
      this.loadReactComponent(sharedViews.ConversationView({
        sdk: OT,
        model: this._conversation,
        video: {enabled: this._conversation.hasVideoStream("outgoing")}
      }));
    }
  });

  /**
   * Local helpers.
   */
  function WebappHelper() {
    this._iOSRegex = /^(iPad|iPhone|iPod)/;
  }

  WebappHelper.prototype = {
    isFirefox: function(platform) {
      return platform.indexOf("Firefox") !== -1;
    },

    isIOS: function(platform) {
      return this._iOSRegex.test(platform);
    }
  };

  /**
   * App initialization.
   */
  function init() {
    var helper = new WebappHelper();
    var client = new loop.StandaloneClient({
      baseServerUrl: baseServerUrl
    });
    var router = new WebappRouter({
      helper: helper,
      notifier: new sharedViews.NotificationListView({el: "#messages"}),
      client: client,
      conversation: new sharedModels.ConversationModel({}, {
        sdk: OT,
        pendingCallTimeout: loop.config.pendingCallTimeout
      })
    });

    Backbone.history.start();
    if (helper.isIOS(navigator.platform)) {
      router.navigate("unsupportedDevice", {trigger: true});
    } else if (!OT.checkSystemRequirements()) {
      router.navigate("unsupportedBrowser", {trigger: true});
    }

    // Set the 'lang' and 'dir' attributes to <html> when the page is translated
    document.documentElement.lang = mozL10n.language.code;
    document.documentElement.dir = mozL10n.language.direction;
  }

  return {
    baseServerUrl: baseServerUrl,
    CallUrlExpiredView: CallUrlExpiredView,
    StartConversationView: StartConversationView,
    DefaultView: DefaultView,
    init: init,
    PromoteFirefoxView: PromoteFirefoxView,
    WebappHelper: WebappHelper,
    WebappRouter: WebappRouter
  };
})(jQuery, _, window.OT, navigator.mozL10n);
