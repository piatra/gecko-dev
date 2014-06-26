/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true */

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
      '<div class="do-not-disturb">',
      '  <p class="dnd-status"><i class="status <%- statusIcon %>">',
      '    </i><%- currentUserStatus %>',
      '  </p>',
      '  <ul class="dnd-menu hide">',
      '    <li class="dnd-menu-item dnd-make-available">',
      '      <i class="status status-available"></i>',
      '      <span data-l10n-id="display_name_available_status"></span>',
      '    </li>',
      '    <li class="dnd-menu-item dnd-make-unavailable">',
      '      <i class="status status-unavailable"></i>',
      '      <span data-l10n-id="display_name_unavailable_status"></span>',
      '    </li>',
      '  </ul>',
      '</div>'
    ].join('')),

    events: {
      "click .dnd-make-available": "toggleAvailable",
      "click .dnd-make-unavailable": "toggleUnavailable",
      "click .dnd-status": "displayDnDMenu",
      "mouseleave": "hideDnDMenu"
    },

    displayDnDMenu: function() {
      $('.dnd-menu', this.$el).removeClass('hide');
    },

    hideDnDMenu: function() {
      $('.dnd-menu', this.$el).addClass('hide');
    },

    /**
     * Toggles mozLoop activation status.
     */
    toggleAvailable: function() {
      navigator.mozLoop.doNotDisturb = false;
      this.hideDnDMenu();
      this.render();
    },

    toggleUnavailable: function() {
      navigator.mozLoop.doNotDisturb = true;
      this.hideDnDMenu();
      this.render();
    },

    render: function() {
      this.$el.html(this.template({
        currentUserStatus: navigator.mozLoop.doNotDisturb ? "Unavailable" : "Available",
        statusIcon: navigator.mozLoop.doNotDisturb ? "status-unavailable" : "status-available"
      }));
      return this;
    }
  });

  /**
   * Panel view.
   */
  var PanelView = sharedViews.BaseView.extend({
    template: _.template([
      '<div class="description">',
      '  <p data-l10n-id="get_link_to_share" class="description-content"></p>',
      '</div>',
      '<div class="action">',
      '  <form class="invite spacer">',
      '    <div class="input-controls">',
      '      <input type="text" class="input-call-url" name="caller"',
      '             data-l10n-id="caller" required>',
      '    </div>',
      '  </form>',
      '  <div class="result hide spacer">',
      '    <div class="input-controls">',
      '      <input id="input-call-url" type="url" readonly>',
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="footer">',
      '  <p class="dnd"></p>',
      '</div>'
    ].join("")),

    className: "share generate-url",

    /**
     * Do not disturb view.
     * @type {DoNotDisturbView|undefined}
     */
    dndView: undefined,

    initialize: function(options) {
      options = options || {};
      if (!options.notifier) {
        throw new Error("missing required notifier");
      }
      this.notifier = options.notifier;
      this.client = new loop.shared.Client({
        baseServerUrl: navigator.mozLoop.serverUrl
      });

      // Get a conversation URL as soon as the menu drops down
      this.getCallUrl();
    },

    // XXX will go away
    // required for backend server
    getNickname: function() {
      return Math.random().toString(36).substring(5);
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
        this.onCallUrlReceived(callUrlData);
      }.bind(this);

      this.setPending();
      this.client.requestCallUrl(this.getNickname(), callback);
    },

    onCallUrlReceived: function(callUrlData) {
      this.notifier.clear();
      this.$(".action .invite").addClass('hide');
      this.$(".action .invite input").val("");
      this.$(".action .result input").val(callUrlData.call_url);
      this.$(".action .result").removeClass('hide');
      this.$(".description p").text(__("share_link_url"));
    },

    setPending: function() {
      this.$("[name=caller]").addClass("pending");
      this.$(".get-url").addClass("disabled").attr("disabled", "disabled");
    },

    clearPending: function() {
      this.$("[name=caller]").removeClass("pending");
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
      this.$el.html(this.template());
      // Do not Disturb sub view
      this.dndView = new DoNotDisturbView({el: this.$(".dnd")}).render();
      return this;
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
      this.loadView(new PanelView({notifier: this._notifier}));
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
