// Copyright (c) 2003-2006 Untangle Networks, Inc.
// All rights reserved.

function ApplicationIframe(parent)
{
   if (0 == arguments.length) {
      return;
   }

   DwtComposite.call(this, parent, "ApplicationIframe", DwtControl.RELATIVE_STYLE);
}

ApplicationIframe.prototype = new DwtComposite();
ApplicationIframe.prototype.constructor = ApplicationIframe;

// public methods -------------------------------------------------------------

ApplicationIframe.prototype.loadUrl = function(url)
{
   this.setContent("<iframe src='" + url + "'></iframe>");
}