/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var loop = loop || {};
loop.feedbackViews = (function(mozL10n) {
  "use strict";

  var FeedbackView = React.createClass({
    propTypes: {
      onAfterFeedbackReceived: React.PropTypes.func.isRequired,
      openURL: React.PropTypes.func.isRequired
    },

    onFeedbackButtonClick: function() {
      this.props.openURL("http://mozilla.com");
      this.props.onAfterFeedbackReceived();
    },

    render: function() {
      return (
        <div className="feedback-view-container">
          <div className="feedback-hello-logo" />
          <div className="feedback-button-container">
            <button onClick={this.onFeedbackButtonClick}
                    ref="feedbackFormBtn">
              {mozL10n.get("feedback_request_button")}
            </button>
          </div>
        </div>
      );
    }
  });

  return {
    FeedbackView: FeedbackView
  };

})(document.mozL10n);
