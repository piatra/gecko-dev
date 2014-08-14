/** @jsx React.DOM */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* jshint newcap:false, esnext:true */
/* global loop:true, React */

var loop = loop || {};
loop.conversation = (function(OT, mozL10n) {
  "use strict";

  var sharedViews = loop.shared.views,
      // aliasing translation function as __ for concision
      __ = mozL10n.get;

  /**
   * App router.
   * @type {loop.desktopRouter.DesktopConversationRouter}
   */
  var router;

  var IncomingCallView = React.createClass({

    propTypes: {
      model: React.PropTypes.object.isRequired,
      video: React.PropTypes.object.isRequired,
      hasVideoStream: React.PropTypes.object.isRequired
    },

    getDefaultProps: function() {
      return {video: {enabled: true}};
    },

    getInitialState: function() {
      return {showDeclineMenu: false};
    },

    componentDidMount: function() {
      window.addEventListener("click", this.clickHandler);
      window.addEventListener("blur", this._hideDeclineMenu);
    },

    componentWillUnmount: function() {
      window.removeEventListener("click", this.clickHandler);
      window.removeEventListener("blur", this._hideDeclineMenu);
    },

    clickHandler: function(e) {
      var target = e.target;
      if (!target.classList.contains('btn-chevron')) {
        this._hideDeclineMenu();
      }
    },

    /**
     * Returns a function that initiates either an audio only or an
     * audio video call
     *
     * @param {string} callType - "audio" or "audio-video"
     *
     **/
    _handleAccept: function(callType) {
      return () => {
        this.props.model.set("selectedCallType", callType);
        this.props.model.trigger("accept");
      };
    },

    _handleDecline: function() {
      this.props.model.trigger("decline");
    },

    _handleDeclineBlock: function(e) {
      this.props.model.trigger("declineAndBlock");
      /* Prevent event propagation
       * stop the click from reaching parent element */
      return false;
    },

    _toggleDeclineMenu: function() {
      var currentState = this.state.showDeclineMenu;
      this.setState({showDeclineMenu: !currentState});
    },

    _hideDeclineMenu: function() {
      this.setState({showDeclineMenu: false});
    },

    render: function() {
      var btnClassBlock = "btn btn-error btn-block";
      var btnClassDecline = "btn btn-error btn-decline";
      var conversationPanelClass = "incoming-call " +
                                  loop.shared.utils.getTargetPlatform();
      var cx = React.addons.classSet;
      var dropdownMenuClassesDecline = cx({
        "native-dropdown-menu": true,
        "conversation-window-dropdown": true,
        "visually-hidden": !this.state.showDeclineMenu
      });
      console.log(this.props.video.enabled);
      console.log(this.props);
      return (
        /* jshint ignore:start */
        <div className={conversationPanelClass}>
          <h2>{__("incoming_call")}</h2>
          <div className="button-group incoming-call-action-group">
            <div className="button-chevron-menu-group">
              <div className="button-group-chevron">
                <div className="button-group">

                  <button className={btnClassDecline}
                          onClick={this._handleDecline}>
                    {__("incoming_call_decline_button")}
                  </button>
                  <div className="btn-chevron"
                       onClick={this._toggleDeclineMenu}>
                  </div>
                </div>

                <ul className={dropdownMenuClassesDecline}>
                  <li className="btn-block" onClick={this._handleDeclineBlock}>
                    {__("incoming_call_decline_and_block_button")}
                  </li>
                </ul>

              </div>
            </div>

            <AcceptCallButton hasVideoStream={this.props.video.enabled}
                        audioCallHandler={this._handleAccept("audio")}
                        videoCallHandler={this._handleAccept("audio-video")} />
          </div>
        </div>
        /* jshint ignore:end */
      );
    }
  });

  /**
   * Answer button for IncomingCallView, renders based on the incoming call
   * type that is passed down via hasVideoStream prop
   *
   * @param {IncomingCallView~_handleAccept} audioCallHandler - Callback fn to
   *                                                  initiate audio only call
   * @param {IncomingCallView~_handleAccept} videoCallHandler - Callback fn to
   *                                                  initiate audio video call
   */
  var AcceptCallButton = React.createClass({

    getDefaultProps: function() {
      return {hasVideoStream: true};
    },

    propTypes: {
      audioCallHandler: React.PropTypes.func.isRequired,
      videoCallHandler: React.PropTypes.func.isRequired,
      hasVideoStream:   React.PropTypes.bool.isRequired
    },

    render: function() {
      var btnClassAcceptVideo = "btn btn-success btn-accept call-audio-video";
      var btnClassAcceptAudio = "btn btn-success btn-accept call-audio-only";
      if (this.props.hasVideoStream) {
        return (
          /* jshint ignore:start */
          /* Answer with video primary + audio secondary */
          <div className="button-chevron-menu-group">
            <div className="button-group">
              <button className={btnClassAcceptVideo}
                      onClick={this.props.videoCallHandler}>
                {__("incoming_call_answer_button")}
              </button>
              <div className="call-audio-only-small"
                   onClick={this.props.audioCallHandler}
                   title={__("incoming_call_answer_audio_only_tooltip")} >
              </div>
            </div>
          </div>
        );
      } else {
        return (
          /* Answer with audio primary + video secondary */
          <div className="button-chevron-menu-group">
            <div className="button-group">
              <button className={btnClassAcceptAudio}
                      onClick={this.props.audioCallHandler}>
                {__("incoming_call_answer_button")}
              </button>
              <div className="call-audio-video-small"
                   onClick={this.props.videoCallHandler}
                   title={__("incoming_call_answer_audio_only_tooltip")} >
              </div>
            </div>
          </div>
          /* jshint ignore:end */
        );
      }
    }
  });

  /**
   * Conversation router.
   *
   * Required options:
   * - {loop.shared.models.ConversationModel} conversation Conversation model.
   * - {loop.shared.components.Notifier}      notifier     Notifier component.
   *
   * @type {loop.shared.router.BaseConversationRouter}
   */
  var ConversationRouter = loop.desktopRouter.DesktopConversationRouter.extend({
    routes: {
      "incoming/:version": "incoming",
      "call/accept": "accept",
      "call/decline": "decline",
      "call/ongoing": "conversation",
      "call/declineAndBlock": "declineAndBlock",
      "call/feedback": "feedback"
    },

    /**
     * @override {loop.shared.router.BaseConversationRouter.startCall}
     */
    startCall: function() {
      this.navigate("call/ongoing", {trigger: true});
    },

    /**
     * @override {loop.shared.router.BaseConversationRouter.endCall}
     */
    endCall: function() {
      this.navigate("call/feedback", {trigger: true});
    },

    /**
     * Incoming call route.
     *
     * @param {String} loopVersion The version from the push notification, set
     *                             by the router from the URL.
     */
    incoming: function(loopVersion) {
      navigator.mozLoop.startAlerting();
      this._conversation.set({loopVersion: loopVersion});
      this._conversation.once("accept", () => {
        this.navigate("call/accept", {trigger: true});
      });
      this._conversation.once("decline", () => {
        this.navigate("call/decline", {trigger: true});
      });
      this._conversation.once("declineAndBlock", () => {
        this.navigate("call/declineAndBlock", {trigger: true});
      });
      this._conversation.once("call:incoming", this.startCall, this);
      this._client.requestCallsInfo(loopVersion, (err, sessionData) => {
        if (err) {
          console.error("Failed to get the sessionData", err);
          // XXX Not the ideal response, but bug 1047410 will be replacing
          //this by better "call failed" UI.
          this._notifier.errorL10n("cannot_start_call_session_not_ready");
          return;
        }
        // XXX For incoming calls we might have more than one call queued.
        // For now, we'll just assume the first call is the right information.
        // We'll probably really want to be getting this data from the
        // background worker on the desktop client.
        // Bug 1032700 should fix this.
        this._conversation.setIncomingSessionData(sessionData[0]);
        this.loadReactComponent(loop.conversation.IncomingCallView({
          model: this._conversation,
          video: {enabled: this._conversation.hasVideoStream("incoming")}
        }));
      });
    },

    /**
     * Accepts an incoming call.
     */
    accept: function() {
      navigator.mozLoop.stopAlerting();
      this._conversation.incoming();
    },

    /**
     * Declines an incoming call.
     */
    decline: function() {
      navigator.mozLoop.stopAlerting();
      // XXX For now, we just close the window
      window.close();
    },

    /**
     * Decline and block an incoming call
     * @note:
     * - loopToken is the callUrl identifier. It gets set in the panel
     *   after a callUrl is received
     */
    declineAndBlock: function() {
      navigator.mozLoop.stopAlerting();
      var token = navigator.mozLoop.getLoopCharPref("loopToken");
      this._client.deleteCallUrl(token, function(error) {
        // XXX The conversation window will be closed when this cb is triggered
        // figure out if there is a better way to report the error to the user
        // (bug 1048909).
        console.log(error);
      });
      window.close();
    },

    /**
     * conversation is the route when the conversation is active. The start
     * route should be navigated to first.
     */
    conversation: function() {
      if (!this._conversation.isSessionReady()) {
        console.error("Error: navigated to conversation route without " +
          "the start route to initialise the call first");
        this._notifier.errorL10n("cannot_start_call_session_not_ready");
        return;
      }

      var callType = this._conversation.get("selectedCallType");
      var videoStream = callType === "audio" ? false : true;

      /*jshint newcap:false*/
      this.loadReactComponent(sharedViews.ConversationView({
        sdk: OT,
        model: this._conversation,
        video: {enabled: videoStream}
      }));
    },

    /**
     * Call has ended, display a feedback form.
     */
    feedback: function() {
      document.title = mozL10n.get("call_has_ended");

      var feebackAPIBaseUrl = navigator.mozLoop.getLoopCharPref(
        "feedback.baseUrl");

      var appVersionInfo = navigator.mozLoop.appVersionInfo;

      var feedbackClient = new loop.FeedbackAPIClient(feebackAPIBaseUrl, {
        product: navigator.mozLoop.getLoopCharPref("feedback.product"),
        platform: appVersionInfo.OS,
        channel: appVersionInfo.channel,
        version: appVersionInfo.version
      });

      this.loadReactComponent(sharedViews.FeedbackView({
        feedbackApiClient: feedbackClient
      }));
    }
  });

  /**
   * Panel initialisation.
   */
  function init() {
    // Do the initial L10n setup, we do this before anything
    // else to ensure the L10n environment is setup correctly.
    mozL10n.initialize(navigator.mozLoop);

    document.title = mozL10n.get("incoming_call_title");

    var client = new loop.Client();
    router = new ConversationRouter({
      client: client,
      conversation: new loop.shared.models.ConversationModel(
        {},         // Model attributes
        {sdk: OT}), // Model dependencies
      notifier: new sharedViews.NotificationListView({el: "#messages"})
    });
    Backbone.history.start();
  }

  return {
    ConversationRouter: ConversationRouter,
    IncomingCallView: IncomingCallView,
    init: init
  };
})(window.OT, document.mozL10n);
