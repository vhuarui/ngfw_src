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

package com.metavize.tran.openvpn.reports;

import java.sql.*;

import com.metavize.mvvm.reporting.BaseSummarizer;
import com.metavize.mvvm.reporting.Util;
import org.apache.log4j.Logger;

public class VpnSummarizer extends BaseSummarizer {

    private static final Logger logger = Logger.getLogger(VpnSummarizer.class);

    public VpnSummarizer() { }

    public String getSummaryHtml(Connection conn, Timestamp startDate, Timestamp endDate)
    {
        int clientsLoggedIn = 0; // # of (successful) client logins
        int clientsDistributed = 0; // # of clients that have been distributed

        try {
            String sql;
            PreparedStatement ps;
            ResultSet rs;

            sql = "SELECT COUNT(*) FROM tr_openvpn_connect_evt WHERE start_time >= ? AND start_time < ?";
            ps = conn.prepareStatement(sql);
            ps.setTimestamp(1, startDate);
            ps.setTimestamp(2, endDate);
            rs = ps.executeQuery();
            rs.first();
            clientsLoggedIn = rs.getInt(1);
            rs.close();
            ps.close();

            sql = "SELECT COUNT(*) FROM tr_openvpn_distr_evt WHERE time_stamp >= ? AND time_stamp < ?";
            ps = conn.prepareStatement(sql);
            ps.setTimestamp(1, startDate);
            ps.setTimestamp(2, endDate);
            rs = ps.executeQuery();
            rs.first();
            clientsDistributed = rs.getInt(1);
            rs.close();
            ps.close();

        } catch (SQLException exn) {
            logger.warn("could not summarize", exn);
        }

        addEntry("User logins", Util.trimNumber("",clientsLoggedIn));
        addEntry("Client distributions", Util.trimNumber("",clientsDistributed));

        // XXXX
        String tranName = "OpenVpn";

        return summarizeEntries(tranName);
    }
}
