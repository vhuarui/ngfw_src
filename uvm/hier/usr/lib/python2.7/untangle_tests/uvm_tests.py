import socket
import unittest2
import os
import subprocess
import sys
import re
import urllib2
import time
import copy
reload(sys)
sys.setdefaultencoding("utf-8")
import re
import subprocess
import ipaddr
import system_props
import time
from jsonrpc import ServiceProxy
from jsonrpc import JSONRPCException
from uvm import Manager
from uvm import Uvm
from untangle_tests import TestDict
from untangle_tests import ClientControl
from untangle_tests import SystemProperties

node = None
nodeFW = None

uvmContext = Uvm().getUvmContext()
systemProperties = SystemProperties()
clientControl = ClientControl()
defaultRackId = 1
origMailsettings = None
test_untangle_com_ip = socket.gethostbyname("test.untangle.com")

def getLatestMailPkg():
    clientControl.runCommand("rm -f mailpkg.tar*") # remove all previous mail packages
    results = clientControl.runCommand("wget -q -t 1 --timeout=3 http://test.untangle.com/test/mailpkg.tar")
    # print "Results from getting mailpkg.tar <%s>" % results
    results = clientControl.runCommand("tar -xvf mailpkg.tar")
    # print "Results from untaring mailpkg.tar <%s>" % results

class UvmTests(unittest2.TestCase):

    @staticmethod
    def nodeName():
        return "uvm"

    @staticmethod
    def vendorName():
        return "Untangle"

    @staticmethod
    def nodeNameSpamCase():
        return "untangle-casing-smtp"

    def setUp(self):
        pass

    def test_010_clientIsOnline(self):
        result = clientControl.isOnline()
        assert (result == 0)

    def test_011_helpLinks(self):
        output, error = subprocess.Popen(['find',
                                          '%s/usr/share/untangle/web/webui/script/'%systemProperties.getPrefix(),
                                          '-name',
                                          '*.js',
                                          '-type',
                                          'f'], stdout=subprocess.PIPE).communicate()
        assert(output)
        for line in output.splitlines():
            print "Checking file %s..." % line
            assert (line)
            if line == "":
                continue

            webUiFile = open( line )
            assert( webUiFile )
            pat  = re.compile(r'''^.*helpSource:\s*['"]+([a-zA-Z_]*)['"]+[\s,]*$''')
            pat2 = re.compile(r'''.*URL=http://wiki.*.untangle.com/(.*)">.*$''')
            for line in webUiFile.readlines():
                match = pat.match(line)
                if match != None:
                    helpSource = match.group(1)
                    assert(helpSource)

                    url = "http://www.untangle.com/docs/get.php?source=" + helpSource + "&uid=0000-0000-0000-0000&version=10.0.0&webui=true&lang=en"
                    print "Checking %s = %s " % (helpSource, url)
                    ret = urllib2.urlopen( url )
                    time.sleep(.1) # dont flood wiki
                    assert(ret)
                    result = ret.read()
                    assert(result)
                    match2 = pat2.match( result )
                    assert(match2)
                    # Check that it redirects somewhere other than /
                    print "Result: \"%s\"" % match2.group(1)
                    assert(match2.group(1))

        assert(True)

    def test_020_aboutInfo(self):
        uid =  uvmContext.getServerUID()
        match = re.search(r'\w{4}-\w{4}-\w{4}.\w{4}', uid)
        assert( match )

        version = uvmContext.adminManager().getFullVersionAndRevision()
        match = re.search(r'\d{1,2}\.\d\.\d\~svn\d{8}r\d{5}main-\w{5,8}',version)
        assert(match)

        kernel = uvmContext.adminManager().getKernelVersion()
        match = re.search(r'\d\.\d\.\d.*', kernel)
        assert(match)

        reboot_count = uvmContext.adminManager().getRebootCount()
        match = re.search(r'\d{1,2}', reboot_count)
        assert(match)

        num_hosts = str(uvmContext.hostTable().getCurrentLicensedSize())
        match = re.search(r'\d{1,2}', num_hosts)
        assert(match)

        max_num_hosts = str(uvmContext.hostTable().getMaxLicensedSize())
        match = re.search(r'\d{1,2}', max_num_hosts)
        assert(match)

    def test_030_testSMTPSettings(self):
        # Test mail setting in config -> email -> outgoing server
        if (uvmContext.nodeManager().isInstantiated(self.nodeNameSpamCase())):
            print "smtp case present"
        else:
            print "smtp not present"
            uvmContext.nodeManager().instantiate(self.nodeNameSpamCase(), 1)
        nodeSP = uvmContext.nodeManager().node(self.nodeNameSpamCase())
        origNodeDataSP = nodeSP.getSmtpNodeSettings()
        origMailsettings = uvmContext.mailSender().getSettings()
        # print nodeDataSP
        getLatestMailPkg();
        # remove previous smtp log file
        clientControl.runCommand("rm -f test_030_testSMTPSettings.log")
        # Start mail sink
        clientControl.runCommand("python fakemail.py --host=" + ClientControl.hostIP +" --log=test_030_testSMTPSettings.log --port 6800 --bg >/dev/null 2>&1")
        newMailsettings = copy.deepcopy(origMailsettings)
        newMailsettings['smtpHost'] = ClientControl.hostIP
        newMailsettings['smtpPort'] = "6800"
        newMailsettings['useMxRecords'] = False

        uvmContext.mailSender().setSettings(newMailsettings)
        time.sleep(10) # give it time for exim to restart

        nodeDataSP = nodeSP.getSmtpNodeSettings()
        nodeSP.setSmtpNodeSettingsWithoutSafelists(nodeDataSP)
        uvmContext.mailSender().sendTestMessage("test@example.com")
        time.sleep(5)

        # Kill mail sink
        clientControl.runCommand("pkill -INT python")
        uvmContext.mailSender().setSettings(origMailsettings)
        nodeSP.setSmtpNodeSettingsWithoutSafelists(origNodeDataSP)
        result = clientControl.runCommand("grep -q 'Untangle Server Test Message' test_030_testSMTPSettings.log")
        assert(result==0)

TestDict.registerNode("uvm", UvmTests)
