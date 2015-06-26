/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var loop = loop || {};
loop.feedbackViews = (function(mozL10n) {
  "use strict";

  var sharedMixins = loop.shared.mixins;

  var FeedbackView = React.createClass({displayName: "FeedbackView",
    mixins: [
      Backbone.Events,
      sharedMixins.WindowCloseMixin
    ],

    render: function() {
      return (
        React.createElement("div", {className: "feedback-view-container"}, 
          React.createElement("div", {className: "feedback-hello-logo"}), 
          React.createElement("div", {className: "feedback-button-container"}, 
            React.createElement("button", null, 
              mozL10n.get("feedback_leave_button")
            )
          )
        )
      );
    }
  });

  return {
    FeedbackView: FeedbackView
  };

})(document.mozL10n);
