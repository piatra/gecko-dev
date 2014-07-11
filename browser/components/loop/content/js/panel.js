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
   *  Reusable dropdown component
   *  Usage:
   *  @type {function} callback The function to be called when the menu item
   *                            is clicked on
   *  @type {string} className Menu component CSS class selector
   *  @type {number} selected Index of the selected component
   *
   *  <Menu select={callback} [selected] [className]>
   *    <YourMenuItemComponent />
   *    <YourMenuItemComponent />
   *  </Menu>
   */
  var MenuItem = React.createClass({displayName: 'MenuItem',
    handleClick: function(event) {
      this.props.toggleMenu(this.props.key);
    },

    render: function() {
      var liStyle = {
        listStyle: "none"
      };
      return (
        React.DOM.li( {style:liStyle, onClick:this.handleClick}, 
          this.props.children
        )
      );
    }
  });

  var Menu = React.createClass({displayName: 'Menu',
    getInitialState: function() {
      return {
        opened: false,
        selected: this.props.selected || 0
      };
    },

    open: function(event) {
      this.setState({open: true});
    },

    select: function(option) {
      this.setState({open: false, selected: option});
      this.props.select(this.props.children[option].getDOMNode());
    },

    render: function() {
      if (!this.state.open) {
        var selectedMenuItem = this.props.children[this.state.selected];
        return (
          MenuItem( {toggleMenu:this.open}, selectedMenuItem)
        );
      }

      var children = React.Children.map(this.props.children,
                                        function(child, index) {
        return MenuItem( {key:index, toggleMenu:this.select}, child);
      }, this);

      // The component that generates the menu should have
      // sane default CSS, therefor I am reseting them
      var ulStyle = {
        padding: 0,
        margin: 0
      };

      return (
        React.DOM.ul( {style:ulStyle, className:this.props.menuCSSClass}, 
          children
        )
      );
    }
  });

  /**
   * Availability drop down menu subview.
   */
  var AvailabilityDropdown = React.createClass({displayName: 'AvailabilityDropdown',
    changeAvailability: function(DOMElement) {
      // Note: side effect!
      if (DOMElement.classList.contains("status-make-available")) {
        this.setState({doNotDisturb: false});
        navigator.mozLoop.doNotDisturb = false;
      }
      if (DOMElement.classList.contains("status-make-dnd")) {
        this.setState({doNotDisturb: true});
        navigator.mozLoop.doNotDisturb = true;
      }
    },

    render: function() {
      // XXX choose which menu item is selected by default
      // there is room for improvement especially when > 2 items
      var defaultItem = navigator.mozLoop.doNotDisturb ? 0 : 1;
      return (
        React.DOM.div( {className:"footer component-spacer"}, 
          React.DOM.div( {className:"do-not-disturb"}, 
            Menu( {selected:defaultItem, select:this.changeAvailability,
                  menuCSSClass:"dnd-menu"}, 
              React.DOM.div( {className:"dnd-menu-item status-make-dnd"}, 
                React.DOM.span(null, __("display_name_dnd_status"))
              ),
              React.DOM.div( {className:"dnd-menu-item status-make-available"}, 
                React.DOM.span(null, __("display_name_available_status"))
              )
            )
          )
        )
      );
    }
  });

  var ToSView = React.createClass({displayName: 'ToSView',
    getInitialState: function() {
      return {seenToS: navigator.mozLoop.getLoopCharPref('seenToS')};
    },

    render: function() {
      var tosHTML = __("legal_text_and_links", {
        "terms_of_use_url": "https://accounts.firefox.com/legal/terms",
        "privacy_notice_url": "www.mozilla.org/privacy/"
      });

      if (!this.state.seenToS) {
        navigator.mozLoop.setLoopCharPref('seenToS', 'seen');
        return React.DOM.p( {className:"terms-service",
                  dangerouslySetInnerHTML:{__html: tosHTML}});
      } else {
        return React.DOM.div(null );
      }
    }
  });

  var PanelLayout = React.createClass({displayName: 'PanelLayout',
    propTypes: {
      summary: React.PropTypes.string.isRequired
    },

    render: function() {
      return (
        React.DOM.div( {className:"component-spacer share generate-url"}, 
          React.DOM.div( {className:"description"}, 
            React.DOM.p( {className:"description-content"}, this.props.summary)
          ),
          React.DOM.div( {className:"action"}, 
            this.props.children
          )
        )
      );
    }
  });

  var CallUrlResult = React.createClass({displayName: 'CallUrlResult',

    getInitialState: function() {
      return {
        pending: false,
        callUrl: ''
      };
    },

    /**
    * Returns a random 5 character string used to identify
    * the conversation.
    * XXX this will go away once the backend changes
    */
    conversationIdentifier: function() {
      return Math.random().toString(36).substring(5);
    },

    componentDidMount: function() {
      this.setState({pending: true});
      this.props.client.requestCallUrl(this.conversationIdentifier(),
                                       this._onCallUrlReceived);
    },

    _onCallUrlReceived: function(err, callUrlData) {
      var callUrl = false;

      this.props.notifier.clear();

      if (err) {
        this.props.notifier.errorL10n("unable_retrieve_url");
      } else {
        callUrl = callUrlData.callUrl || callUrlData.call_url;
      }

      this.setState({pending: false, callUrl: callUrl});
    },

    render: function() {
      // XXX setting elem value from a state (in the callUrl input)
      // makes it immutable ie read only but that is fine in our case.
      // readOnly attr will suppress a warning regarding this issue
      // from the react lib.
      var cx = React.addons.classSet;
      return (
        PanelLayout( {summary:__("share_link_header_text")}, 
          React.DOM.div( {className:"invite"}, 
            React.DOM.input( {type:"url", value:this.state.callUrl, readOnly:"true",
                   className:cx({'pending': this.state.pending})} )
          )
        )
      );
    }
  });

  /**
   * Panel view.
   */
  var PanelView = React.createClass({displayName: 'PanelView',
    propTypes: {
      notifier: React.PropTypes.object.isRequired,
      client: React.PropTypes.object.isRequired
    },

    render: function() {
      return (
        React.DOM.div(null, 
          CallUrlResult( {client:this.props.client,
                       notifier:this.props.notifier} ),
          ToSView(null ),
          AvailabilityDropdown(null )
        )
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

      this.on("panel:open panel:closed", this.clearNotifications, this);
      this.on("panel:open", this.reset, this);
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
      // XXX pass in the visibility status to detect when to generate a new
      // panel view
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

    clearNotifications: function() {
      this._notifier.clear();
    },

    /**
     * Resets this router to its initial state.
     */
    reset: function() {
      this._notifier.clear();
      var client = new loop.Client({
        baseServerUrl: navigator.mozLoop.serverUrl
      });
      this.loadReactComponent(PanelView( {client:client,
                                         notifier:this._notifier} ));
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
    AvailabilityDropdown: AvailabilityDropdown,
    CallUrlResult: CallUrlResult,
    PanelView: PanelView,
    PanelRouter: PanelRouter,
    ToSView: ToSView
  };
})(_, document.mozL10n);
