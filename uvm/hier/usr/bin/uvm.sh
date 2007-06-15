#! /bin/sh
# $Id$

# get a bunch of default values
source @PREFIX@/etc/default/untangle-vm

UVM_CONSOLE_LOG=${UVM_CONSOLE_LOG:-"@PREFIX@/var/log/uvm/console.log"}
UVM_UVM_LOG=${UVM_UVM_LOG:-"@PREFIX@/var/log/uvm/uvm.log"}
UVM_GC_LOG=${UVM_GC_LOG:-"@PREFIX@/var/log/uvm/gc.log"}
UVM_WRAPPER_LOG=${UVM_WRAPPER_LOG:-"@PREFIX@/var/log/uvm/wrapper.log"}
UVM_LAUNCH=${UVM_LAUNCH:-"@PREFIX@/usr/share/untangle/bin/bunnicula"}

# somewhat less fucking hideous :)
PG_VERSION=`dpkg --get-selections postgresql-mv* | awk '/install$/ { gsub(/postgresql-mv-?/, "", $1) ; print $1 }'`
if [[ -z "$PG_VERSION" ]] ; then
    PGDATA=${POSTGRES_DATA:-/var/lib/postgres/data}
    PGSERVICE="postgresql"
else
    PGDATA=${POSTGRES_DATA:-/var/lib/postgresql/${PG_VERSION}/main}
    PGSERVICE="postgresql-${PG_VERSION}"
fi

# Short enough to restart uvm promptly
SLEEP_TIME=5

# Used to kill a child with extreme prejudice
nukeIt() {
    echo "uvm.sh: Killing -9 all bunnicula \"$pid\" (`date`)" >> $UVM_WRAPPER_LOG
    kill -3 $pid
    kill -9 $pid
    kill -9 `ps awwx | grep java | grep bunnicula | awk '{print $1}'` 2>/dev/null
}

reapChildHardest() {
    nukeIt
    flushIptables ; exit
}

reapChildHarder() {
    echo "uvm.sh: Killing -15 all bunnicula \"$pid\" (`date`)" >> $UVM_WRAPPER_LOG
    kill $pid
    sleep 1
    if [ ! -z "`ps awwx | grep java | grep bunnicula | awk '{print $1}'`" ] ; then
        echo "uvm.sh: Killing -15 all bunnicula \"$pid\" (`date`)" >> $UVM_WRAPPER_LOG
        for i in `seq 1 5` ; do
            if [ -z "`ps awwx | grep java | grep bunnicula | awk '{print $1}'`" ] ; then
                flushIptables ; exit
            fi
            sleep 1
        done
        if [ ! -z "`ps awwx | grep java | grep bunnicula | awk '{print $1}'`" ] ; then
            reapChildHardest
        fi
    fi
    flushIptables ; exit
}

reapChild() {
    echo "uvm.sh: shutting down bunnicula " >> $UVM_WRAPPER_LOG
    kill -3 $pid
    @PREFIX@/usr/bin/mcli -t 20000 shutdown &> /dev/null
    sleep 1
    kill -INT $pid
    if [ ! -z "`ps awwx | grep java | grep bunnicula | awk '{print $1}'`" ] ; then
        echo "uvm.sh: Killing -INT all bunnicula \"$pid\" (`date`)" >> $UVM_WRAPPER_LOG
        for i in `seq 1 5` ; do
            if [ -z "`ps awwx | grep java | grep bunnicula | awk '{print $1}'`" ] ; then
                flushIptables ; exit
            fi
            sleep 1
        done
        if [ ! -z "`ps awwx | grep java | grep bunnicula | awk '{print $1}'`" ] ; then
            reapChildHarder
        fi
    fi
    flushIptables ; exit
}


flushIptables() {
    /sbin/iptables -t nat -F
    /sbin/iptables -t mangle -F
    /sbin/iptables -t filter -F
    /sbin/iptables -t raw -F
}

raiseFdLimit() {
    ulimit -n 2000
    ulimit -n 4000
    ulimit -n 8000
    ulimit -n 16000
    ulimit -n 32000
    ulimit -n 64000
    ulimit -n 128000
    ulimit -n 256000
    ulimit -n 512000
    ulimit -n 1024000
}

getLicenseKey() {
  # the wizard has not run yet, exit right away
  [[ ! -f $ACTIVATION_KEY_FILE ]] && return

  # if the activation temp file isn't there, but the activation one
  # is, it means we already have a valid key, so we don't want to
  # proceed any further.
  #
  # Copyright TeamJanky 2007: the double test is to avoid a possible
  # race condition where we pass 1), but the other backgrounded curl
  # completes before 2), and then when we reach 3) our temp file has
  # already been deleted and we're left in the cold...
  [[ -f $ACTIVATION_KEY_FILE_TMP ]] || return
  ## Let the other curl take precedence
  ps aux | grep -q '[c]url' && return
  [[ -f $ACTIVATION_KEY_FILE_TMP ]] || return

  KEY=`cat $ACTIVATION_KEY_FILE_TMP`

  # for CD downloads, the temp key is only 0s, so we need to ask the
  # server for a brand new one; that's done by not supplying any value
  # to the CGI variable
  [[ $KEY = $FAKE_KEY ]] && KEY=""

  if curl --insecure --fail -o $TMP_ARCHIVE `printf ${ACTIVATION_URL_TEMPLATE} "$KEY" $(/usr/share/untangle/bin/utip)`; then
    rm -f $ACTIVATION_KEY_FILE_TMP
    tar -C / -xf $TMP_ARCHIVE
    @UVM_HOME@/bin/utactivate
    @UVM_HOME@/bin/utregister # trigger root passwd generation
  fi
}

isServiceRunning() {
  extraArgs=""
  if [[ -n $2 ]] ; then
    extraArgs="-x"
    shift
  fi
  # I cannot fucking believe I have to call pidof 3 times in a row to
  # "make sure" (#2534)
  let i=0
  while [[ $i -lt 3 ]] ; do
    pidof $extraArgs "$1" && return 0
    let i=$i+1
    sleep .5
  done
  return 1
}

restartServiceIfNeeded() {
  serviceName=$1

  needToRun=no

  case $serviceName in
    postgresql)
# Removing the postgres pid file just makes restarting harder.  The init.d script deals ok as is.
      pidFile=
      isServiceRunning postmaster && return
      serviceName=$PGSERVICE
      needToRun=yes # always has to run
      ;;
    slapd)
      pidFile=/var/run/slapd/slapd.pid
      isServiceRunning slapd && return
      needToRun=yes # always has to run
      ;;
    spamassassin)
      pidFile=/var/run/spamd.pid
      isServiceRunning --find-shell spamd && return
      confFile=/etc/default/spamassassin
      [ -f $confFile ] && grep -q ENABLED=1 $confFile && needToRun=yes
      ;;
    clamav-daemon)
      pidFile="/var/run/clamav/clamd.pid"
      isServiceRunning clamd && return
      dpkg -l clamav-daemon | grep -q -E '^ii' && needToRun=yes
      ;;
    clamav-freshclam)
      pidFile="/var/run/clamav/freshclam.pid"
      isServiceRunning freshclam && return
      dpkg -l clamav-freshclam | grep -q -E '^ii' && needToRun=yes
      ;;
    untangle-support-agent)
      pidFile="/var/run/rbot.pid"
      # this is a bit janky, need something better...
      isServiceRunning ruby && return
      pidof sshd && needToRun=yes
      ;;
  esac

  if [ $needToRun == "yes" ] ; then
    echo "*** restarting missing $serviceName on `date` ***" >> $UVM_WRAPPER_LOG
    if [ -n "$pidFile" ]; then
        rm -f $pidFile
    fi
#    /etc/init.d/$serviceName stop
    /etc/init.d/$serviceName start
  fi
}

# Return true (0) when we need to reap and restart the uvm.
needToRestart() {
    cheaphigh=`head -3 /proc/$pid/maps | tail -1 | awk '{ high=split($1, arr, "-"); print arr[2]; }'`
    if [ -z $cheaphigh ]; then
        # not fatal, process has probably just died, which we'll catch soon.
        echo "*** no heap size ($cheaphigh) on `date` in `pwd` ***" >> $UVM_WRAPPER_LOG
    else
        bignibble=${cheaphigh:0:1}
        case $bignibble in
            0 | 1)
                # less than 384Meg native heap
                ;;
            2)
                # 384Meg < native heap < 640Meg
                if [ $MEM -lt 1000000 ] || [ `date +%H` -eq 1 ] ; then
                    echo "*** bunnicula heap soft limit on `date` in `pwd` ***" >> $UVM_WRAPPER_LOG
                    return 0;
                fi
                ;;
            3 | 4 | 5 | 6 | 7 | 8 | 9)
                # native heap > 640Meg
                echo "*** bunnicula heap hard limit ($bignibble) on `date` in `pwd` ***" >> $UVM_WRAPPER_LOG
                return 0;
                ;;
            *)
                echo "*** unexpected heap size ($bignibble) on `date` in `pwd` ***" >> $UVM_WRAPPER_LOG
                ;;
        esac
    fi

    # gc failure (persistent heap full)
    cmfcount=`tail -50 $UVM_GC_LOG | grep -ci "concurrent mode failure"`
    if [ $cmfcount -gt 2 ]; then
        echo "*** java heap cmf on `date` in `pwd` ***" >> $UVM_WRAPPER_LOG
        return 0;
    fi

    # extra nightime checks
    if [ `date +%H` -eq 1 ]; then
        # VSZ greater than 1.1 gigs reboot
        VIRT="`cat /proc/$pid/status | grep VmSize | awk '{print $2}'`"
        if [ $VIRT -gt $MAX_VIRTUAL_SIZE ] ; then
            echo "*** Virt Size too high ($VIRT) on `date` in `pwd` ***" >> $UVM_WRAPPER_LOG
            return 0;
        fi
    fi

    return 1;
}


trap reapChildHardest 6
trap reapChildHarder 15
trap reapChild 2

while true; do
    echo > $UVM_CONSOLE_LOG
    echo "============================" >> $UVM_CONSOLE_LOG
    echo $UVM_LAUNCH >> $UVM_CONSOLE_LOG
    echo "============================" >> $UVM_CONSOLE_LOG

    echo >> $UVM_WRAPPER_LOG
    echo "============================" >> $UVM_WRAPPER_LOG
    echo $UVM_LAUNCH >> $UVM_WRAPPER_LOG
    echo "============================" >> $UVM_WRAPPER_LOG

    raiseFdLimit
    flushIptables

    $UVM_LAUNCH $* >>$UVM_CONSOLE_LOG 2>&1 &

    pid=$!
    echo "Bunnicula launched. (pid:$pid) (`date`)" >> $UVM_WRAPPER_LOG

# Instead of waiting, we now monitor.
    while true; do

        # try to fetch a key right away; bg'ed so as to not block the
        # rest of the uvm.sh tasks. We ensure only one key-fetching
        # function runs at all times
        getLicenseKey &

        sleep $SLEEP_TIME

        if [ "x" = "x@PREFIX@" ] ; then
            if [ ! -d /proc/$pid ] ; then
                echo "*** restarting missing bunnicula $? on `date` ***" >> $UVM_WRAPPER_LOG
                break
            fi
            if needToRestart; then
                echo "*** need to restart bunnicula $? on `date` ***" >> $UVM_WRAPPER_LOG
                nukeIt
                break
            fi
            restartServiceIfNeeded postgresql
            restartServiceIfNeeded clamav-freshclam
            restartServiceIfNeeded clamav-daemon
            restartServiceIfNeeded spamassassin
            restartServiceIfNeeded slapd
            restartServiceIfNeeded untangle-support-agent
        fi
    done

# Clean up the zombie.  Risky? XXX
#    wait $pid

# Crash/Kill
    flushIptables
    echo "*** bunnicula exited on `date` in `pwd` ***" >> $UVM_WRAPPER_LOG
    echo "*** copied $UVM_CONSOLE_LOG to $UVM_CONSOLE_LOG.crash ***" >> $UVM_WRAPPER_LOG
    echo "*** copied $UVM_UVM_LOG to $UVM_UVM_LOG.crash ***" >> $UVM_WRAPPER_LOG
    echo "*** copied $UVM_GC_LOG to $UVM_GC_LOG.crash ***" >> $UVM_WRAPPER_LOG
    cp -fa $UVM_CONSOLE_LOG.crash.1 $UVM_CONSOLE_LOG.crash.2
    cp -fa $UVM_CONSOLE_LOG.crash $UVM_CONSOLE_LOG.crash.1
    cp -fa $UVM_CONSOLE_LOG $UVM_CONSOLE_LOG.crash
    cp -fa $UVM_UVM_LOG.crash.1 $UVM_UVM_LOG.crash.2
    cp -fa $UVM_UVM_LOG.crash $UVM_UVM_LOG.crash.1
    cp -fa $UVM_UVM_LOG $UVM_UVM_LOG.crash
    cp -fa $UVM_GC_LOG.crash.1 $UVM_GC_LOG.crash.2
    cp -fa $UVM_GC_LOG.crash $UVM_GC_LOG.crash.1
    cp -fa $UVM_GC_LOG $UVM_GC_LOG.crash

    sleep 2
    echo "*** restarting on `date` ***" >> $UVM_WRAPPER_LOG
done
