<%@page language="java" import="com.untangle.mvvm.*"%>

<%
/*
 * Copyright (c) 2003-2007 Untangle, Inc.
 * All rights reserved.
 *
 * This software is the confidential and proprietary information of
 * Untangle, Inc. ("Confidential Information"). You shall
 * not disclose such Confidential Information.
 *
 * $Id$
 */
%>
<%@ taglib uri="/WEB-INF/taglibs/quarantine_euv.tld" prefix="quarantine" %>

<%
MvvmLocalContext mvvm = MvvmContextFactory.context();
BrandingSettings bs = mvvm.brandingManager().getBrandingSettings();
String company = bs.getCompanyName();
String companyUrl = bs.getCompanyUrl();
%>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title><%=company%> | Redirect Quarantine Emails for <quarantine:currentAddress/></title>
<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1"/>
<link rel="stylesheet" href="styles/style.css" type="text/css"/>
<style type="text/css">
/* <![CDATA[ */
@import url(/images/base.css);
/* ]]> */
</style>  
</head>
<body>
<div id="main">
 <!-- Box Start -->
 <div class="main-top-left"></div><div class="main-top-right"></div><div class="main-mid-left"><div class="main-mid-right"><div class="main-mid">
 <!-- Content Start -->
	
	<div class="page_head">
        <a href="<%=companyUrl%>"><img src="/images/BrandingLogo.gif" border="0" alt="<%=company%> logo"/></a> <div>Redirect Quarantine Emails for <br /><quarantine:currentAddress/></div>
	</div>
	
    <hr />
	
	
	
	<center>

	<div style="padding: 10px 0; margin: 0 auto; width: 440px; text-align: left;">       
        Please enter and submit the email address that will manage the
        quarantined emails for &quot;<quarantine:currentAddress/>&quot;.
        This association does <i>not</i> affect all email,
        it will only forward quarantined emails for
        &quot;<quarantine:currentAddress/>&quot;
        to the quarantine of this other email address.
    </div>
        

    <table><tbody>
          <quarantine:hasMessages type="info">
          <tr>
            <td>
              <ul class="messageText">
                <quarantine:forEachMessage type="info">
                  <li><quarantine:message/></li>
                </quarantine:forEachMessage>
              </ul>
            </td>
          </tr>
          </quarantine:hasMessages>
    </tbody></table>
    <table><tbody>
          <quarantine:hasMessages type="error">
          <tr>
            <td>
              <ul class="errortext">
                <quarantine:forEachMessage type="error">
                  <li><quarantine:message/></li>
                </quarantine:forEachMessage>
              </ul>
            </td>
          </tr>
          </quarantine:hasMessages>
    </tbody></table>

    </center>

     <!-- INPUT FORM 2 -->
     <form name="form2" action="mp">
       <input type="hidden" name="<quarantine:constants keyName="action"/>" value="remap" />
       <input type="hidden" name="<quarantine:constants keyName="tkn"/>" value="<quarantine:currentAuthToken encoded="false"/>" />
        <table><tbody>
          <tr>
            <td class="enteremail">
              <table><tbody>
                <tr><td>Redirect To: </td><td><input type="text" name="mapaddr" /></tr>
                <tr><td colspan="2"><button type="submit">Submit</button></td></tr>
              </tbody></table>
            </td>
          </tr>
        </tbody></table>
    </form>


    <address>Powered by Untangle&trade; Server</address>

	<hr />
	
 <!-- Content End -->
 </div></div></div><div class="main-bot-left"></div><div class="main-bot-right"></div>
 <!-- Box End -->
</div>
</body>
</html>
