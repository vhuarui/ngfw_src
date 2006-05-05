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

package com.metavize.tran.firewall;

import com.metavize.mvvm.tran.ParseException;
import com.metavize.mvvm.tran.firewall.ip.IPDBMatcher;
import com.metavize.mvvm.tran.firewall.port.PortDBMatcher;
import com.metavize.mvvm.tran.firewall.ProtocolMatcher;
import com.metavize.mvvm.tran.firewall.TrafficDirectionRule;

/**
 * Rule for matching based on IP addresses and subnets.
 *
 * @author <a href="mailto:rbscott@metavize.com">Robert Scott</a>
 * @version 1.0
 * @hibernate.class
 * table="FIREWALL_RULE"
 */
public class FirewallRule extends TrafficDirectionRule
{
    private static final long serialVersionUID = -5024800839738084290L;

    private static final String ACTION_BLOCK     = "Block";
    private static final String ACTION_PASS      = "Pass";

    private static final String[] ACTION_ENUMERATION = { ACTION_BLOCK, ACTION_PASS };

    private boolean isTrafficBlocker;

    // constructors -----------------------------------------------------------

    /**
     * Hibernate constructor.
     */
    public FirewallRule()
    {
    }

    public FirewallRule( boolean       isLive,     ProtocolMatcher protocol,
                         boolean       inbound,    boolean outbound,
                         IPDBMatcher   srcAddress, IPDBMatcher       dstAddress,
                         PortDBMatcher srcPort,    PortDBMatcher     dstPort,
                         boolean isTrafficBlocker )
    {
        super( isLive, protocol, inbound, outbound, srcAddress, dstAddress, srcPort, dstPort );
        
        /* Attributes of the firewall */
        this.isTrafficBlocker = isTrafficBlocker;
    }


    // accessors --------------------------------------------------------------

    /**
     * Does this rule block traffic or let it pass.
     *
     * @return if this rule blocks traffic.
     * @hibernate.property
     * column="IS_TRAFFIC_BLOCKER"
     */
    public boolean isTrafficBlocker()
    {
        return isTrafficBlocker;
    }

    public void setTrafficBlocker( boolean isTrafficBlocker )
    {
        this.isTrafficBlocker = isTrafficBlocker;
    }

    public  String getAction()
    {

        return ( isTrafficBlocker ) ? ACTION_BLOCK : ACTION_PASS;
    }

    public  void setAction( String action ) throws ParseException
    {
        if ( action.equalsIgnoreCase( ACTION_BLOCK )) {
            isTrafficBlocker = true;
        } else if ( action.equalsIgnoreCase( ACTION_PASS )) {
            isTrafficBlocker = false;
        } else {
            throw new ParseException( "Invalid action: " + action );
        }
    }

    public static String[] getActionEnumeration()
    {
        return ACTION_ENUMERATION;
    }

    public static String getActionDefault()
    {
        return ACTION_ENUMERATION[0];
    }
}
