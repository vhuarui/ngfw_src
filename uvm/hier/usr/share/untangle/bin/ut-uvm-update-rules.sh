#!/bin/dash

# This script updates the iptables rules for the untangle-vm
# If it detects the untangle-vm is running it inserts the rules necessary to "redirect" traffic to the UVM
# If it detects the untangle-vm is not running it removes the rules (if they exist)
# If you pass -r as an option it will remove the rules regardless

TUN_DEV=utun
TUN_ADDR="192.0.2.42"
FORCE_REMOVE="false"

MASK_BYPASS=$((0x01000000))
MASK_BOGUS=$((0x80000000)) # unused mark
TCP_REDIRECT_PORTS="9500-9627"

iptables_debug()
{
   echo "[`date`] /sbin/iptables $@"
   /sbin/iptables "$@"
}

iptables_debug_onerror()
{
    # Ignore -N errors
    /sbin/iptables "$@" || {
        [ "${3}x" != "-Nx" ] && echo "[`date`] Failed: /sbin/iptables $@"
    }

    true
}

if [ -z "${IPTABLES}" ] ; then
    IPTABLES=iptables
fi

## Function to determine the pid of the process that owns the queue
queue_owner()
{
    UVM_PID="invalid"
    
    if [ ! -f /proc/net/netfilter/nfnetlink_queue ] ; then return ; fi

    local t_queue_pid=`awk -v queue=0 '{ if ( $1 == queue ) print $2 }' /proc/net/netfilter/nfnetlink_queue`
    if [ -z "${t_queue_pid}" ]; then return ; fi
    
    UVM_PID=${t_queue_pid}  
}

## Function to determine if the UVM is running
is_uvm_running()
{
    queue_owner

    if [ "${UVM_PID}x" = "invalidx" ]; then return ; fi

    if [ ! -f "/proc/${UVM_PID}/cmdline" ]; then return ; fi
    
    grep -q com.untangle.uvm /proc/${UVM_PID}/cmdline 2>| /dev/null  && echo "true"
}

insert_iptables_rules()
{    
    local t_address
    local t_tcp_port_range

    # Do not track output from the UVM 
    # If its UDP or ICMP its part of an existing session, and tracking it will create a new erroneous session
    # If its TCP its non-locally bound and won't go through iptables anyway
    KERNVER=$(uname -r | awk -F. '{ printf("%02d%02d%02d\n",$1,$2,$3); }')
    ORIGVER=30000

    if [ "$KERNVER" -ge "$ORIGVER" ]; then
        ${IPTABLES} -A OUTPUT -t raw -m mark --mark ${MASK_BYPASS}/${MASK_BYPASS} -j CT --notrack -m comment --comment 'CT NOTRACK packets with bypass bit mark set'
    else
        ${IPTABLES} -A OUTPUT -t raw -m mark --mark ${MASK_BYPASS}/${MASK_BYPASS} -j NOTRACK -m comment --comment 'NOTRACK packets with bypass bit mark set'
    fi

    # The UDP packets sent from the UVM seem to have an out intf of the primary wan by default
    # Routing occurs again after OUTPUT chain but only seems to take effect if the packet has been changed
    # This hack toggles one bit on the mark so it has changed which seems to force the re-routing to happen.
    # This is necessary in scenarios where there are multiple independent bridges with WANs in each.
    ${IPTABLES} -A OUTPUT -t mangle -p udp -j MARK --set-mark ${MASK_BOGUS}/${MASK_BOGUS} -m comment --comment 'change the mark of all UDP packets to force re-route after OUTPUT'

    # SYN/ACKs will be unmarked by default so we need to restore the connmark so that they will be routed correctly based on the mark
    # This ensures the response goes back out the correct interface 
    ${IPTABLES} -A OUTPUT -t mangle -p tcp --tcp-flags SYN,ACK SYN,ACK -m comment --comment 'restore mark on reinject packet' -j restore-interface-marks

    # Redirect any re-injected packets from the TUN interface to us
    ## Add a redirect rule for each address,
    ${IPTABLES} -t nat -N uvm-tcp-redirect >/dev/null 2>&1
    ${IPTABLES} -t nat -F uvm-tcp-redirect >/dev/null 2>&1

    ${IPTABLES} -t tune -N queue-to-uvm >/dev/null 2>&1
    ${IPTABLES} -t tune -F queue-to-uvm >/dev/null 2>&1

    # Insert redirect table in beginning of PREROUTING
    ${IPTABLES} -I PREROUTING -t nat -i ${TUN_DEV} -p tcp -g uvm-tcp-redirect -m comment --comment 'Redirect utun traffic to untangle-vm'

    ${IPTABLES} -A POSTROUTING -t tune -j queue-to-uvm -m comment --comment 'Queue packets to the Untangle-VM'

    # We insert one -j DNAT rule for each local address
    # This is necessary so that the destination address is maintained when replying (with the SYN/ACK)
    # with a regular REDIRECT a random (the first?) address is chosen to reply with (like 192.0.2.43) so for inbound connection the response may go out the wrong WAN
    for t_address in `ip -f inet addr show | awk '/^ *inet/ { sub( "/.*", "", $2 ) ; print $2 }'` ; do
        if [ "${t_address}" = "127.0.0.1" ]; then continue ; fi
        if [ "${t_address}" = "192.0.2.42" ]; then continue ; fi
        if [ "${t_address}" = "192.0.2.43" ]; then continue ; fi
        ${IPTABLES} -A uvm-tcp-redirect -t nat -i ${TUN_DEV} -t nat -p tcp --destination ${t_address}  -j DNAT --to-destination ${t_address}:${TCP_REDIRECT_PORTS} -m comment --comment "Redirect reinjected packets to ${t_address} to the untangle-vm"
    done
    
    # Redirect TCP traffic to the local ports (where the untangle-vm is listening)
    ${IPTABLES} -A uvm-tcp-redirect -t nat -i ${TUN_DEV} -t nat -p tcp -j REDIRECT --to-ports ${TCP_REDIRECT_PORTS} -m comment --comment 'Redirect reinjected packets to the untangle-vm'

    # Ignore loopback traffic
    ${IPTABLES} -A queue-to-uvm -t tune -i lo -j RETURN -m comment --comment 'Do not queue loopback traffic'
    ${IPTABLES} -A queue-to-uvm -t tune -o lo -j RETURN -m comment --comment 'Do not queue loopback traffic'

    # Ignore traffic that is related to a session we are not watching.
    # If its "related" according to iptables, then original session must have been bypassed
    ${IPTABLES} -A queue-to-uvm -t tune -m conntrack --ctstate RELATED  -j RETURN -m comment --comment 'Do not queue (bypass) sessions related to other bypassed sessions'

    # Ignore traffic that has no conntrack info because we cant NAT it.
    ${IPTABLES} -A queue-to-uvm -t tune -m conntrack --ctstate INVALID  -j RETURN -m comment --comment 'Do not queue (bypass) sessions without conntrack info'

    # Ignore bypassed traffic.
    ${IPTABLES} -A queue-to-uvm -t tune -m mark --mark ${MASK_BYPASS}/${MASK_BYPASS} -j RETURN -m comment --comment 'Do not queue (bypass) all packets with bypass bit set'

    # Queue all of the SYN packets.
    ${IPTABLES} -A queue-to-uvm -t tune -p tcp --syn -j NFQUEUE -m comment --comment 'Queue TCP SYN packets to the untangle-vm'

    # Queue all of the UDP packets.
    ${IPTABLES} -A queue-to-uvm -t tune -m addrtype --dst-type unicast -p udp -j NFQUEUE -m comment --comment 'Queue Unicast UDP packets to the untange-vm'

    # Redirect packets destined to non-local sockets to local
    ${IPTABLES} -I PREROUTING 2 -t mangle -p tcp -m socket -j MARK --set-mark 0xFE00/0xFF00 -m comment --comment "route traffic to non-locally bound sockets to local"
    ${IPTABLES} -I PREROUTING 3 -t mangle -p icmp --icmp-type 3/4 -m socket -j MARK --set-mark 0xFE00/0xFF00 -m comment --comment "route ICMP Unreachable Frag needed traffic to local"

    # Route traffic tagged by previous rule to local
    ip rule del priority 100 >/dev/null 2>&1
    ip rule add priority 100 fwmark 0xFE00/0xFF00 lookup 1000
    ip route add local 0.0.0.0/0 dev lo table 1000 >/dev/null 2>&1 # ignore error if exists

    # Unfortunately we have to give utun an address or the reinjection does not work
    # Use a bogus address
    ifconfig ${TUN_DEV} ${TUN_ADDR} netmask 255.255.255.0 
    ifconfig ${TUN_DEV} up

    if [ -f /proc/sys/net/ipv4/conf/${TUN_DEV}/rp_filter ]; then
        echo 0 > /proc/sys/net/ipv4/conf/${TUN_DEV}/rp_filter
    else
        echo "[`date`] ${TUN_DEV} device not exist."
    fi

}

remove_iptables_rules()
{
    ${IPTABLES} -t nat -F uvm-tcp-redirect >/dev/null 2>&1
    ${IPTABLES} -t tune -F queue-to-uvm >/dev/null 2>&1

    KERNVER=$(uname -r | awk -F. '{ printf("%02d%02d%02d\n",$1,$2,$3); }')
    ORIGVER=30000

    if [ "$KERNVER" -ge "$ORIGVER" ]; then
        ${IPTABLES} -D OUTPUT -t raw -m mark --mark ${MASK_BYPASS}/${MASK_BYPASS} -j CT --notrack -m comment --comment 'CT NOTRACK packets with bypass bit mark set' >/dev/null 2>&1
    else
        ${IPTABLES} -D OUTPUT -t raw -m mark --mark ${MASK_BYPASS}/${MASK_BYPASS} -j NOTRACK -m comment --comment 'NOTRACK packets with bypass bit mark set' >/dev/null 2>&1
    fi
    ${IPTABLES} -D OUTPUT -t mangle -p udp -j MARK --set-mark ${MASK_BOGUS}/${MASK_BOGUS} -m comment --comment 'change the mark of all UDP packets to force re-route after OUTPUT' >/dev/null 2>&1
    ${IPTABLES} -D PREROUTING -t nat -i ${TUN_DEV} -p tcp -g uvm-tcp-redirect -m comment --comment 'Redirect utun traffic to untangle-vm' >/dev/null 2>&1
    ${IPTABLES} -D POSTROUTING -t tune -j queue-to-uvm -m comment --comment 'Queue packets to the Untangle-VM' >/dev/null 2>&1
    ${IPTABLES} -D PREROUTING -t mangle -p tcp -m socket -j MARK --set-mark 0xFE00/0xFF00 -m comment --comment "route traffic to non-locally bound sockets to local" >/dev/null 2>&1
    
    # delete the old 0xfb marking rule too in case this was a recent upgrade (we moved 0xfb to 0xfe so on the first run this will still exist)
    # this can be deleted in the future (11.0+)
    ${IPTABLES} -D PREROUTING -t mangle -p tcp -m socket -j MARK --set-mark 0xFB00/0xFF00 -m comment --comment "route traffic to non-locally bound sockets to local" >/dev/null 2>&1

    ip rule del priority 100 >/dev/null 2>&1
}

while getopts "r" opt; do
    case $opt in
        r) FORCE_REMOVE="true";;
    esac
done

if [ "$FORCE_REMOVE" = "true" ] ; then
  echo "[`date`] Removing iptables rules ..."
  remove_iptables_rules
  echo "[`date`] Removing iptables rules ... done"
  return 0
fi

if [ "`is_uvm_running`x" = "truex" ] ; then
    echo "[`date`] The untangle-vm is running. Inserting iptables rules ... "
    remove_iptables_rules # just in case
    insert_iptables_rules
    echo "[`date`] The untangle-vm is running. Inserting iptables rules ... done"
else
  echo "[`date`] The untangle-vm is not running. Removing iptables rules ..."
  remove_iptables_rules
  echo "[`date`] The untangle-vm is not running. Removing iptables rules ... done"
fi

return 0


