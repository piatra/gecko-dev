from marionette_test import MarionetteTestCase
from marionette.errors import NoSuchElementException
from marionette.errors import StaleElementException
from marionette.errors import InvalidResponseException
from marionette.wait import Wait
from ipdb import set_trace
from time import sleep
import os
import subprocess
import signal

SERVER_COMMAND = ("make", "runserver")
SERVER_ENV = os.environ.copy()
# Set PORT so that it does not interfere with any other
# development server that might be running
SERVER_ENV.update({"NODE_ENV": "test", "PORT": "4000"})

class LoopTestServer:
    def __init__(self):
        loop_server_location = os.environ.get('LOOP_SERVER')
        if loop_server_location is None:
            raise Exception('LOOP_SERVER variable not set')

        os.chdir(loop_server_location)

        self.loop_server = subprocess.Popen(SERVER_COMMAND, env=SERVER_ENV)

    def shutdown(self):
        self.loop_server.send_signal(signal.SIGTERM)


class TestGetUrl(MarionetteTestCase):
    # XXX Move this to setup class so it doesn't restart the server
    # after every test
    def setUp(self):
        # start server
        self.loop_server = LoopTestServer()

        MarionetteTestCase.setUp(self)

        preferences = {"loop.server": "http://localhost:5000"}
        self.marionette.enforce_gecko_prefs(preferences)

        # this is browser chrome, kids, not the content window just yet
        self.marionette.set_context("chrome")

    def switch_to_panel(self):
        button = self.marionette.find_element("id", "loop-call-button")

        # click the element
        button.click()

        # switch to the frame
        frame = self.marionette.find_element("id", "loop")
        self.marionette.switch_to_frame(frame)

    # taken from https://github.com/mozilla-b2g/gaia/blob/master/tests/python/gaia-ui-tests/gaiatest/gaia_test.py#L858
    # XXX factor out into utility object for use by other tests
    def wait_for_element_displayed(self, by, locator, timeout=None):
        print "Looking for %s %s " % (by, locator)
        Wait(self.marionette, timeout,
             ignored_exceptions=[NoSuchElementException, StaleElementException])\
            .until(lambda m: m.find_element(by, locator).is_displayed())
        return self.marionette.find_element(by, locator)

    def test_get_url(self):
        self.switch_to_panel()

        # get and check for a call url
        url_input = self.wait_for_element_displayed("tag name", "input")

        # wait for pending state to finish
        self.assertEqual(url_input.get_attribute("class"), "pending",
                            "expect the input to be pending");

        # get and check the input
        url_input = self.wait_for_element_displayed("class name",
                                                    "callUrl")
        self.assertNotEqual(url_input.get_attribute('value'), u'',
                         "input is populated with call URL after pending is finished")

        # save the call url
        call_url = url_input.get_attribute("value")
        print call_url

        # change the context so that you can call navigate method
        self.marionette.set_context("content")
        self.marionette.navigate(call_url)

        # look for a call button or fail
        call_button = self.wait_for_element_displayed("class name", "btn-success")
        call_button.click()
        sleep(2)

        # look for a conversation window popup
        self.marionette.set_context("chrome")
        self.marionette.switch_to_frame()
        frame = self.marionette.find_element("id", "chatbox")
        print frame
        self.marionette.switch_to_frame(frame)

    def tearDown(self):
        self.loop_server.shutdown()
        MarionetteTestCase.tearDown(self)
