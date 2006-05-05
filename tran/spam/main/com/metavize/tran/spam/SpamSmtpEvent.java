/*
 * Copyright (c) 2005 Metavize Inc.
 * All rights reserved.
 *
 * This software is the confidential and proprietary information of
 * Metavize Inc. ("Confidential Information").  You shall
 * not disclose such Confidential Information.
 *
 * $Id$
 */

package com.metavize.tran.spam;


import com.metavize.tran.mail.papi.MessageInfo;
import com.metavize.tran.mail.papi.AddressKind;

/**
 * Log for SMTP Spam events.
 *
 * @author <a href="mailto:amread@metavize.com">Aaron Read</a>
 * @version 1.0
 * @hibernate.class
 * table="TR_SPAM_EVT_SMTP"
 * mutable="false"
 */
public class SpamSmtpEvent extends SpamEvent
{
    private MessageInfo messageInfo;
    private float score;
    private boolean isSpam;
    private SMTPSpamMessageAction action;
    private String vendorName;

    // constructors -----------------------------------------------------------

    /**
     * Hibernate constructor.
     */
    public SpamSmtpEvent() { }

    public SpamSmtpEvent(MessageInfo messageInfo, float score, boolean isSpam,
                         SMTPSpamMessageAction action, String vendorName)
    {
        this.messageInfo = messageInfo;
        this.score = score;
        this.isSpam = isSpam;
        this.action = action;
        this.vendorName = vendorName;
    }

    // SpamEvent methods ------------------------------------------------------

    public String getType()
    {
        return "SMTP";
    }

    public int getActionType()
    {
        char type = action.getKey();
        if (SMTPSpamMessageAction.PASS_KEY == type) {
            return PASSED;
        } else if (SMTPSpamMessageAction.MARK_KEY == type) {
            return MARKED;
        } else if (SMTPSpamMessageAction.BLOCK_KEY == type) {
            return BLOCKED;
        } else { // QUARANTINE_KEY
            return QUARANTINED;
        }
    }

    public String getActionName()
    {
        return action.toString();
    }

    // Better sender/receiver info available for smtp
    public String getSender()
    {
        String sender = get(AddressKind.ENVELOPE_FROM);
        if (sender.equals(""))
            // Just go back to the FROM header (if any).
            return super.getSender();
        else
            return sender;
    }

    public String getReceiver()
    {
        String receiver = get(AddressKind.ENVELOPE_TO);

        // This next should never happen, but just in case...
        if (receiver.equals(""))
            // Just go back to the TO header (if any).
            return super.getReceiver();
        else
            return receiver;
    }

    
    // accessors --------------------------------------------------------------

    /**
     * Associate e-mail message info with event.
     *
     * @return e-mail message info.
     * @hibernate.many-to-one
     * column="MSG_ID"
     * cascade="save-update"
     */
    public MessageInfo getMessageInfo()
    {
        return messageInfo;
    }

    public void setMessageInfo(MessageInfo messageInfo)
    {
        this.messageInfo = messageInfo;
    }

    /**
     * Spam scan score.
     *
     * @return the spam score
     * @hibernate.property
     * column="SCORE"
     */
    public float getScore()
    {
        return score;
    }

    public void setScore(float score)
    {
        this.score = score;
    }

    /**
     * Was it declared spam?
     *
     * @return true if the message is declared to be Spam
     * @hibernate.property
     * column="IS_SPAM"
     */
    public boolean isSpam()
    {
        return isSpam;
    }

    public void setSpam(boolean isSpam)
    {
        this.isSpam = isSpam;
    }

    /**
     * The action taken
     *
     * @return action.
     * @hibernate.property
     * type="com.metavize.tran.spam.SMTPSpamMessageActionUserType"
     * column="ACTION"
     */
    public SMTPSpamMessageAction getAction()
    {
        return action;
    }

    public void setAction(SMTPSpamMessageAction action)
    {
        this.action = action;
    }

    /**
     * Spam scanner vendor.
     *
     * @return the vendor
     * @hibernate.property
     * column="VENDOR_NAME"
     */
    public String getVendorName()
    {
        return vendorName;
    }

    public void setVendorName(String vendorName)
    {
        this.vendorName = vendorName;
    }
}
