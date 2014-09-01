/** @jsx React.DOM */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* jshint newcap:false */
/* global loop:true, React */

(function() {
  "use strict";

  // 1. Desktop components
  // 1.1 Panel
  var PanelView = loop.panel.PanelView;
  // 1.2. Conversation Window
  var IncomingCallView = loop.conversation.IncomingCallView;

  // 2. Standalone webapp
  var CallUrlExpiredView    = loop.webapp.CallUrlExpiredView;
  var StartConversationView = loop.webapp.StartConversationView;

  // 3. Shared components
  var ConversationToolbar = loop.shared.views.ConversationToolbar;
  var ConversationView = loop.shared.views.ConversationView;
  var FeedbackView = loop.shared.views.FeedbackView;

  // Local helpers
  function returnTrue() {
    return true;
  }

  function returnFalse() {
    return false;
  }

  // Feedback API client configured to send data to the stage input server,
  // which is available at https://input.allizom.org
  var stageFeedbackApiClient = new loop.FeedbackAPIClient(
    "https://input.allizom.org/api/v1/feedback", {
      product: "Loop"
    }
  );

  var mockClient = {
    requestCallUrl: function() {}
  };

  var mockConversationModel = new loop.shared.models.ConversationModel({}, {sdk: {}});

  var Example = React.createClass({
    render: function() {
      var cx = React.addons.classSet;
      return (
        <div className="example">
          <h3>{this.props.summary}</h3>
          <div className={cx({comp: true, dashed: this.props.dashed})}
               style={this.props.style || {}}>
            {this.props.children}
          </div>
        </div>
      );
    }
  });

  var Section = React.createClass({
    render: function() {
      return (
        <section id={this.props.name}>
          <h1>{this.props.name}</h1>
          {this.props.children}
        </section>
      );
    }
  });

  var ShowCase = React.createClass({
    render: function() {
      return (
        <div className="showcase">
          <header>
            <h1>Loop UI Components Showcase</h1>
            <nav className="showcase-menu">{
              React.Children.map(this.props.children, function(section) {
                return (
                  <a className="btn btn-info" href={"#" + section.props.name}>
                    {section.props.name}
                  </a>
                );
              })
            }</nav>
          </header>
          {this.props.children}
        </div>
      );
    }
  });

  var App = React.createClass({
    render: function() {
      return (
        <ShowCase>
          <Section name="PanelView">
            <p className="note">
              <strong>Note:</strong> 332px wide.
            </p>
            <Example summary="Call URL retrieved" dashed="true" style={{width: "332px"}}>
              <PanelView callUrl="http://invalid.example.url/" client={mockClient} />
            </Example>
            <Example summary="Pending call url retrieval" dashed="true" style={{width: "332px"}}>
              <PanelView client={mockClient} />
            </Example>
          </Section>

          <Section name="IncomingCallView">
            <Example summary="Default" dashed="true" style={{width: "280px"}}>
              <div className="fx-embedded">
                <IncomingCallView />
              </div>
            </Example>
          </Section>

          <Section name="IncomingCallView-ActiveState">
            <Example summary="Default" dashed="true" style={{width: "280px"}}>
              <div className="fx-embedded" data-trigger-click="btn-chevron">
                <IncomingCallView />
              </div>
            </Example>
          </Section>

          <Section name="ConversationToolbar">
            <h3>Desktop Conversation Window</h3>
            <div className="fx-embedded override-position">
              <Example summary="Default (260x265)" dashed="true">
                <ConversationToolbar video={{enabled: true}}
                                     audio={{enabled: true}}
                                     hangup={noop}
                                     publishStream={noop} />
              </Example>
              <Example summary="Video muted">
                <ConversationToolbar video={{enabled: false}}
                                     audio={{enabled: true}}
                                     hangup={noop}
                                     publishStream={noop} />
              </Example>
              <Example summary="Audio muted">
                <ConversationToolbar video={{enabled: true}}
                                     audio={{enabled: false}}
                                     hangup={noop}
                                     publishStream={noop} />
              </Example>
            </div>

            <h3>Standalone</h3>
            <div className="standalone override-position">
              <Example summary="Default">
                <ConversationToolbar video={{enabled: true}} audio={{enabled: true}} />
              </Example>
              <Example summary="Video muted">
                <ConversationToolbar video={{enabled: false}} audio={{enabled: true}} />
              </Example>
              <Example summary="Audio muted">
                <ConversationToolbar video={{enabled: true}} audio={{enabled: false}} />
              </Example>
            </div>
          </Section>

          <Section name="StartConversationView">

            <Example summary="Start conversation view" dashed="true">
              <div className="standalone">
                <StartConversationView model={mockConversationModel}
                  client={mockClient} />
              </div>
            </Example>

          </Section>

          <Section name="ConversationView">

            <Example summary="Desktop conversation window" dashed="true"
                     style={{width: "260px", height: "265px"}}>
              <div className="fx-embedded">
                <ConversationView sdk={{}}
                                  video={{enabled: true}}
                                  audio={{enabled: true}}
                                  model={mockConversationModel} />
              </div>
            </Example>

            <Example summary="Desktop conversation window local audio stream"
                     dashed="true" style={{width: "260px", height: "265px"}}>
              <div className="fx-embedded">
                <ConversationView video={{enabled: false}} audio={{enabled: true}}
                                  model={mockConversationModel} />
              </div>
            </Example>

            <Example summary="Standalone version">
              <div className="standalone">
                <ConversationView sdk={{}}
                                  model={mockConversationModel}
                                  video={{enabled: true}}
                                  audio={{enabled: true}} />
              </div>
            </Example>
          </Section>

          <Section name="ConversationView-640">
            <Example summary="640px breakpoint for conversation view">
              <div className="breakpoint" style={{"text-align":"center"}}>
                <div className="standalone">
                  <ConversationView video={{enabled: true}} audio={{enabled: true}}
                    model={mockConversationModel} />
                </div>
                <iframe style={{"width":"400px","height":"600px"}}></iframe>
              </div>
            </Example>
          </Section>

          <Section name="ConversationView-LocalAudio">
            <Example summary="Local stream is audio only">
              <div className="standalone">
                <ConversationView video={{enabled: false}} audio={{enabled: true}}
                  model={mockConversationModel} />
              </div>
            </Example>
          </Section>

          <Section name="FeedbackView">
            <p className="note">
              <strong>Note:</strong> For the useable demo, you can access submitted data at&nbsp;
              <a href="https://input.allizom.org/">input.allizom.org</a>.
            </p>
            <Example summary="Default (useable demo)" dashed="true" style={{width: "280px"}}>
              <FeedbackView feedbackApiClient={stageFeedbackApiClient} />
            </Example>
            <Example summary="Detailed form" dashed="true" style={{width: "280px"}}>
              <FeedbackView step="form" />
            </Example>
            <Example summary="Thank you!" dashed="true" style={{width: "280px"}}>
              <FeedbackView step="finished" />
            </Example>
          </Section>

          <Section name="CallUrlExpiredView">
            <Example summary="Firefox User">
              <CallUrlExpiredView helper={{isFirefox: returnTrue}} />
            </Example>
            <Example summary="Non-Firefox User">
              <CallUrlExpiredView helper={{isFirefox: returnFalse}} />
            </Example>
          </Section>

          <Section name="AlertMessages">
            <Example summary="Various alerts">
              <div className="alert alert-warning">
                <button className="close"></button>
                <p className="message">
                  The person you were calling has ended the conversation.
                </p>
              </div>
              <br />
              <div className="alert alert-error">
                <button className="close"></button>
                <p className="message">
                  The person you were calling has ended the conversation.
                </p>
              </div>
            </Example>
          </Section>

        </ShowCase>
      );
    }
  });

  /**
   * Simulate events and enable active state for component showcase
   * */
  function _triggerActiveComponents() {
    var components = document.querySelectorAll('[data-trigger-click]');
    [].forEach.call(components, function(comp) {
      var className = comp.dataset.triggerClick;
      var triggerClick = simulateClick.bind(null, comp);
      var multipleNodes = className.split(' ');
      if (multipleNodes.length > 1) { // if multiple nodes
        multipleNodes.forEach(triggerClick);
      } else {
        triggerClick(className);
      }
    });

    function simulateClick(parentComponent, sel) {
      var node = parentComponent.querySelector("." + sel);
      if (node) {
        React.addons.TestUtils.Simulate.click(node);
      }
    }
  }

  /**
   * Render components that have different styles across
   * CSS media rules in their own iframe to mimic the viewport
   * */
  function _renderComponentsInIframes() {
    var parents = document.querySelectorAll('.breakpoint');
    [].forEach.call(parents, appendChildInIframe);

    /**
     * Extracts the component from the DOM and appends in the an iframe
     *
     * @type {HTMLElement} parent - Parent DOM node of a component & iframe
     * */
    function appendChildInIframe(parent) {
      var styles     = document.querySelector('head').children;
      var component  = parent.children[0];
      var iframe     = parent.children[1];
      iframe.src    = "about:blank";
      // Workaround for bug 297685
      iframe.onload = function () {
        var iframeHead = iframe.contentDocument.querySelector('head');
        iframe.contentDocument.documentElement.querySelector('body')
                                              .appendChild(component);

        [].forEach.call(styles, function(style) {
          iframeHead.appendChild(style.cloneNode(true));
        });

      }
    }
  }

  window.addEventListener("DOMContentLoaded", function() {
    var body = document.body;
    body.className = loop.shared.utils.getTargetPlatform();

    /* XXX we should properly mock the component dependencies
     * it would remove the need for a try/catch block and would
     * reveal meaningful debug messages in the console
     * */
    try {
      React.renderComponent(<App />, body);
    } catch (e) {
      console.log(e);
    }

    _triggerActiveComponents();
    _renderComponentsInIframes();
  });

})();
