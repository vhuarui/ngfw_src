-- events schema for release 3.1

-----------
-- events |
-----------

-- com.metavize.tran.nat.DhcpLeaseEvent
CREATE TABLE events.tr_nat_evt_dhcp (
    event_id int8 NOT NULL,
    mac varchar(255),
    hostname varchar(255),
    ip inet,
    end_of_lease timestamp,
    event_type int4,
    time_stamp timestamp,
    PRIMARY KEY (event_id));

-- com.metavize.tran.nat.DhcpAbsoluteLease
CREATE TABLE events.dhcp_abs_lease (
    event_id int8 NOT NULL,
    mac varchar(255),
    hostname varchar(255),
    ip inet, end_of_lease timestamp,
    event_type int4,
    PRIMARY KEY (event_id));

-- com.metavize.tran.nat.DhcpAbsoluteEvent
CREATE TABLE events.tr_nat_evt_dhcp_abs (
    event_id int8 NOT NULL,
    time_stamp timestamp,
    PRIMARY KEY (event_id));

-- com.metavize.tran.nat.DhcpAbsoluteEvent.absoluteLeaseList
CREATE TABLE events.tr_nat_evt_dhcp_abs_leases (
    event_id int8 NOT NULL,
    lease_id int8 NOT NULL,
    position int4 NOT NULL,
    PRIMARY KEY (event_id, position));

-- com.metavize.tran.nat.RedirectEvent
CREATE TABLE events.tr_nat_redirect_evt (
    event_id int8 NOT NULL,
    pl_endp_id int8,
    rule_id int8,
    rule_index int4,
    is_dmz bool,
    time_stamp timestamp,
    PRIMARY KEY (event_id));

-- com.metavize.tran.nat.NatStatisticEvent
CREATE TABLE events.tr_nat_statistic_evt (
    event_id int8 NOT NULL,
    nat_sessions int4,
    dmz_sessions int4,
    tcp_incoming int4,
    tcp_outgoing int4,
    udp_incoming int4,
    udp_outgoing int4,
    icmp_incoming int4,
    icmp_outgoing int4,
    time_stamp timestamp,
    PRIMARY KEY (event_id));

----------------
-- constraints |
----------------

-- indeces for reporting

CREATE INDEX tr_nat_redirect_evt_plepid_idx ON events.tr_nat_redirect_evt (pl_endp_id);
