/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

describe("loop.feedbackViews", function() {
  "use strict";

  var expect = chai.expect;
  var TestUtils = React.addons.TestUtils;
  var sandbox;
  var mozL10nGet;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    mozL10nGet = sandbox.stub(document.mozL10n, "get", function(x) {
      return x;
    });
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("FeedbackView", function() {
    function mountTestComponent(props) {
      props = _.extend({
        openURL: function() {},
        onAfterFeedbackReceived: function() {}
      }, props);
      return TestUtils.renderIntoDocument(
        React.createElement(loop.feedbackViews.FeedbackView, props));
    }

    it("should render a feedback view", function() {
      var component = mountTestComponent({
        openURL: function() {},
        onAfterFeedbackReceived: function() {}
      });

      expect(component.getDOMNode()
          .querySelectorAll(".feedback-hello-logo").length)
          .to.eql(1);
    });

    it("should render a button with correct text", function() {
      var component = mountTestComponent();

      sinon.assert.calledWithExactly(mozL10nGet, "feedback_request_button");
    });

    it("should open a new page to the feedback form", function() {
      var stub = sandbox.stub();
      var component = mountTestComponent({
        openURL: stub
      });

      TestUtils.Simulate.click(component.refs.feedbackFormBtn.getDOMNode());

      sinon.assert.calledOnce(stub);
    });

    it("should close the window after opening the form", function() {
      var stub = sandbox.stub();
      var component = mountTestComponent({
        onAfterFeedbackReceived: stub
      });

      TestUtils.Simulate.click(component.refs.feedbackFormBtn.getDOMNode());

      sinon.assert.calledOnce(stub);
    });
  });
});
