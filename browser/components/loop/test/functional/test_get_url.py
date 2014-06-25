from marionette_test import MarionetteTestCase
from marionette.errors import NoSuchElementException
from marionette.errors import StaleElementException
from marionette.errors import InvalidResponseException
from marionette.wait import Wait
from ipdb import set_trace
from marionette import Marionette
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

        script_path = os.path.join(os.path.dirname(__file__), "user.js")
        script_file = open(script_path, 'r')
        script = script_file.read()
        self.marionette.set_context(self.marionette.CONTEXT_CHROME)

        # this is browser chrome, kids, not the content window just yet
        self.marionette.set_context("chrome")

    def switch_to_panel(self):
        button = self.marionette.find_element("id", "loop-call-button")

        # click the element
        button.click()

        # switch to the frame
        #from ipdb import set_trace
        #set_trace()
        frame = self.marionette.find_element("id", "loop")
        #fs = self.marionette.find_elements("tag name", "iframe")
        self.marionette.switch_to_frame(frame)

    # taken from https://github.com/mozilla-b2g/gaia/blob/master/tests/python/gaia-ui-tests/gaiatest/gaia_test.py#L858
    # XXX factor out into utility object for use by other tests
    def wait_for_element_displayed(self, by, locator, timeout=None):
        Wait(self.marionette, timeout,
             ignored_exceptions=[NoSuchElementException, StaleElementException])\
            .until(lambda m: m.find_element(by, locator).is_displayed())
        return self.marionette.find_element(by, locator)

    def test_get_url(self):

        self.switch_to_panel()

        # get and check the input
        url_input = self.wait_for_element_displayed("class name",
                                                    "caller_input")
        self.assertEqual(url_input.get_attribute('value'), u'',
                         "call-url element not initially empty")

        # click for focus and send keys
        url_input.click()
        self.assertTrue(url_input.is_selected,
                        "clicking the URL input did not select it")
        url_input.send_keys("larry's call")

        # click the button to request a URL
        get_url_button = self.marionette.find_element("class name",
                                                      "get-url")
        get_url_button.click()

        # wait for and verify that we get something back
        url_output = self.wait_for_element_displayed("id", "call-url")

        self.assertNotEqual(url_output.get_attribute("value"), u'',
                            "call-url element not populated after click")

    def tearDown(self):
        self.loop_server.shutdown()
        MarionetteTestCase.tearDown(self)
