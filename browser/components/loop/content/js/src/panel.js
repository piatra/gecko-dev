/** @jsx React.DOM */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*jshint newcap:false*/
/*global loop:true, React */

var loop = loop || {};
loop.panel = (function(_, mozL10n) {
  "use strict";

  var sharedViews = loop.shared.views,
      // aliasing translation function as __ for concision
      __ = mozL10n.get;

  /**
   * Panel router.
   * @type {loop.desktopRouter.DesktopRouter}
   */
  var router;

  /**
   * Do not disturb panel subview.
   */
  var DoNotDisturbView = sharedViews.BaseView.extend({
    template: _.template([
      '<label>',
      '  <input type="checkbox" <%- checked %>>',
      '  <span data-l10n-id="do_not_disturb"></span>',
      '</label>',
    ].join('')),

    events: {
      "click input[type=checkbox]": "toggle"
    },

    /**
     * Toggles mozLoop activation status.
     */
    toggle: function() {
      navigator.mozLoop.doNotDisturb = !navigator.mozLoop.doNotDisturb;
      this.render();
    },

    render: function() {
      this.$el.html(this.template({
        checked: navigator.mozLoop.doNotDisturb ? "checked" : ""
      }));
      return this;
    }
  });

  var InviteForm = React.createClass({
    // XXX: this triggers an error in the browser console: gL10nDetails is not defined
    //      that's probably because we're missing the definitions available in
    //      standalone/index.html
    mixins: [sharedViews.ReactL10nMixin],

    getInitialState: function() {
      return {
        pending: false,
        callUrl: false
      };
    },

    handleFormSubmit: function(e) {
      console.log("in handleFormSubmit");
      var callback = function(err, callUrlData) {
        this.clearPending();
        if (err) {
          this.notifier.errorL10n("unable_retrieve_url");
          console.error("getCallUrl ERROR");
          // XXX this does not make sense now.
          //this.render();
          return;
        }
        this.onCallUrlReceived(callUrlData);
      }.bind(this);
      var nickname = this.refs.caller.getDOMNode().value;
      this.props.client.requestCallUrl(nickname, callback);
      return false;
    },

    onCallUrlReceived: function(response) {
      this.setState({callUrl: response.call_url});
    },

    clearPending: function() {
      this.setState({pending: false});
    },

    setPending: function() {
      this.setState({pending: true});
    },

    // XXX this could be improved
    inviteInputState: function() {
      if (this.state.pending)
        return 'pending';
      if (this.state.callUrl)
        return 'hide';
      return '';
    },

    callUrlInputState: function() {
      if (this.state.callUrl)
        return '';
      return 'hide';
    },

    render: function() {
      return (
        React.DOM.form({
          className: "invite",
          onSubmit: this.handleFormSubmit
        },
          React.DOM.input({
            type: "text",
            name: "caller",
            className: this.inviteInputState(),
            ref: "caller",
            "data-l10n-id": "caller",
            required: "required",
          }),
          React.DOM.input({
            // XXX setting elem value from a state makes it immutable ie read only
            // but that is fine in our case. readOnly attr will supress a warning
            // regarding this issue from the react lib
            value: this.state.callUrl,
            className: this.callUrlInputState(),
            readOnly: true
          }),
          React.DOM.button({
            type: "submit",
            className: "get-url btn btn-success",
            "data-l10n-id": "get_a_call_url"
          })
        )
      );
    }
  });

  /**
   * Panel view.
   */
  var PanelView = React.createClass({
    /**
     * Do not disturb view.
     * @type {DoNotDisturbView|undefined}
     */
    dndView: undefined,

    events: {
      "keyup input[name=caller]": "changeButtonState",
      "click a.go-back": "goBack"
    },

    componentWillMount: function() {
      this.notifier = this.props.notifier;
      this.client = new loop.shared.Client({
        baseServerUrl: navigator.mozLoop.serverUrl
      });
    },

    getNickname: function() {
      return this.$("input[name=caller]").val();
    },

    getCallUrl: function() {
      this.notifier.clear();
      var callback = function(err, callUrlData) {
        this.clearPending();
        if (err) {
          this.notifier.errorL10n("unable_retrieve_url");
          this.render();
          return;
        }
        // XXX Move this to the InviteForm component (at least partly)
        this.onCallUrlReceived(callUrlData);
      }.bind(this);

      this.setPending();
      this.client.requestCallUrl(this.getNickname(), callback);
    },

    goBack: function(event) {
      event.preventDefault();
      this.$(".action .result").hide();
      this.$(".action .invite").show();
      this.$(".description p").text(__("get_link_to_share"));
      this.changeButtonState();
    },

    onCallUrlReceived: function(callUrlData) {
      this.notifier.clear();
      this.$(".action .invite").hide();
      this.$(".action .invite input").val("");
      this.$(".action .result input").val(callUrlData.call_url);
      this.$(".action .result").show();
      this.$(".description p").text(__("share_link_url"));
    },

    setPending: function() {
      this.$("[name=caller]").addClass("pending");
      this.$(".get-url").addClass("disabled").attr("disabled", "disabled");
    },

    clearPending: function() {
      this.$("[name=caller]").removeClass("pending");
      this.refs.caller.getDOMNode().classList.remove("pending");
      this.changeButtonState();
    },

    changeButtonState: function() {
      var enabled = !!this.$("input[name=caller]").val();
      if (enabled) {
        this.$(".get-url").removeClass("disabled")
            .removeAttr("disabled", "disabled");
      } else {
        this.$(".get-url").addClass("disabled").attr("disabled", "disabled");
      }
    },

    render: function() {
      return (
        <InviteForm client={this.client} notifier={this.notifier} />
      );
    }
  });

  var PanelRouter = loop.desktopRouter.DesktopRouter.extend({
    /**
     * DOM document object.
     * @type {HTMLDocument}
     */
    document: undefined,

    routes: {
      "": "home"
    },

    initialize: function(options) {
      options = options || {};
      if (!options.document) {
        throw new Error("missing required document");
      }
      this.document = options.document;

      this._registerVisibilityChangeEvent();

      this.on("panel:open panel:closed", this.reset, this);
    },

    /**
     * Register the DOM visibility API event for the whole document, and trigger
     * appropriate events accordingly:
     *
     * - `panel:opened` when the panel is open
     * - `panel:closed` when the panel is closed
     *
     * @link  http://www.w3.org/TR/page-visibility/
     */
    _registerVisibilityChangeEvent: function() {
      this.document.addEventListener("visibilitychange", function(event) {
        this.trigger(event.currentTarget.hidden ? "panel:closed"
                                                : "panel:open");
      }.bind(this));
    },

    /**
     * Default entry point.
     */
    home: function() {
      this.reset();
    },

    /**
     * Resets this router to its initial state.
     */
    reset: function() {
      // purge pending notifications
      this._notifier.clear();
      // reset home view
      this.loadReactComponent(<PanelView notifier={this._notifier} />);
    }
  });

  /**
   * Panel initialisation.
   */
  function init() {
    // Do the initial L10n setup, we do this before anything
    // else to ensure the L10n environment is setup correctly.
    mozL10n.initialize(navigator.mozLoop);

    router = new PanelRouter({
      document: document,
      notifier: new sharedViews.NotificationListView({el: "#messages"})
    });
    Backbone.history.start();

    // Notify the window that we've finished initalization and initial layout
    var evtObject = document.createEvent('Event');
    evtObject.initEvent('loopPanelInitialized', true, false);
    window.dispatchEvent(evtObject);
  }

  return {
    init: init,
    PanelView: PanelView,
    DoNotDisturbView: DoNotDisturbView,
    PanelRouter: PanelRouter
  };
})(_, document.mozL10n);
