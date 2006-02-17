/*
 * Copyright (c) 2003, 2004, 2005, 2006 Metavize Inc.
 * All rights reserved.
 *
 * This software is the confidential and proprietary information of
 * Metavize Inc. ("Confidential Information").  You shall
 * not disclose such Confidential Information.
 *
 *  $Id$
 */

package com.metavize.mvvm.engine;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;

import java.net.Inet4Address;
import java.util.LinkedList;
import java.util.List;
import java.util.Properties;

import org.apache.log4j.Logger;

import com.metavize.mvvm.ArgonManager;
import com.metavize.mvvm.IntfConstants;
import com.metavize.mvvm.IntfEnum;
import com.metavize.mvvm.MvvmContextFactory;
import com.metavize.mvvm.NetworkingConfiguration;
import com.metavize.mvvm.NetworkingManager;
import com.metavize.mvvm.NetworkManager;

import com.metavize.mvvm.argon.IntfConverter;

import com.metavize.mvvm.networking.NetworkException;
import com.metavize.mvvm.networking.NetworkingConfigurationImpl;

import com.metavize.mvvm.tran.IPaddr;
import com.metavize.mvvm.tran.ValidateException;

import com.metavize.mvvm.tran.firewall.intf.IntfMatcherFactory;
import com.metavize.mvvm.tran.firewall.intf.IntfMatcher;

class NetworkingManagerImpl implements NetworkingManager
{
    // These are the predefined ones.  There can be others.
    private static final String HEADER         = "##AUTOGENERATED BY METAVIZE DO NOT MODIFY MANUALLY\n\n";
    private static final String BUNNICULA_BASE = System.getProperty( "bunnicula.home" );
    private static final String BUNNICULA_CONF = System.getProperty( "bunnicula.conf.dir" );

    private static final String SSH_ENABLE_SCRIPT      = BUNNICULA_BASE + "/ssh_enable.sh";
    private static final String SSH_DISABLE_SCRIPT     = BUNNICULA_BASE + "/ssh_disable.sh";
    private static final String DHCP_RENEW_SCRIPT      = BUNNICULA_BASE + "/networking/dhcp-renew";

    private static final String IP_CFG_FILE    = "/etc/network/interfaces";
    private static final String NS_CFG_FILE    = "/etc/resolv.conf";
    private static final String FLAGS_CFG_FILE = "/networking.sh";
    private static final String SSHD_PID_FILE  = "/var/run/sshd.pid";

    private static final String NS_PARAM       = "nameserver";

    private static final String FLAG_TCP_WIN   = "TCP_WINDOW_SCALING_EN";
    private static final String FLAG_HTTP_IN   = "MVVM_ALLOW_IN_HTTP";
    private static final String FLAG_HTTPS_OUT = "MVVM_ALLOW_OUT_HTTPS";
    private static final String FLAG_HTTPS_RES = "MVVM_ALLOW_OUT_RES";
    private static final String FLAG_OUT_NET   = "MVVM_ALLOW_OUT_NET";
    private static final String FLAG_OUT_MASK  = "MVVM_ALLOW_OUT_MASK";
    private static final String FLAG_EXCEPTION = "MVVM_IS_EXCEPTION_REPORTING_EN";
    private static final String FLAG_POST_FUNC = "MVVM_POST_CONF";
    private static final String POST_FUNC_NAME =  "postConfigurationScript";
    /* Functionm declaration for the post configuration function */
    private static final String DECL_POST_CONF = "function " + POST_FUNC_NAME + "() {";

    private static final String PROPERTY_FILE       = BUNNICULA_CONF + "/mvvm.networking.properties";
    private static final String PROPERTY_HTTPS_PORT = "mvvm.https.port";
    private static final String PROPERTY_COMMENT    = "Properties for the networking configuration";

    private static final Logger logger = Logger.getLogger( NetworkingManagerImpl.class );

    private static NetworkingManagerImpl INSTANCE = new NetworkingManagerImpl();

    /* A cache of the current configuration */
    NetworkingConfiguration configuration = null;

    private IntfEnum intfEnum;

    private NetworkingManagerImpl()
    {
    }

    /**
     * Retrieve the current network configuration
     */
    public synchronized NetworkingConfiguration get()
    {
        return getNetworkManager().getNetworkingConfiguration();
    }

    /**
     * Set a network configuration.
     * @param configuration - Configuration to save
     */
    public synchronized void set( NetworkingConfiguration netConfig ) throws ValidateException
    {
        try {
            getNetworkManager().setNetworkingConfiguration( netConfig );
        } catch ( NetworkException e ) {
            logger.error( "Network exception while setting the network configuration.", e );
            /* !!! This is kind of dangerous */
            throw new ValidateException( "Unable to save the network configuration" );
        }
    }

    /* Get the external HTTPS port */
    public int getExternalHttpsPort()
    {
        return getNetworkManager().getPublicHttpsPort();
    }

    public IntfEnum getIntfEnum()
    {
        return getNetworkManager().getIntfEnum();
    }

    public NetworkingConfiguration renewDhcpLease() throws Exception
    {
        return getNetworkManager().renewDhcpLease();
    }

    private NetworkManager getNetworkManager()
    {
        return MvvmContextFactory.context().networkManager();
    }

    private void save()
    {
        try {
            saveHttpsPort();
        } catch ( Exception e ) {
            logger.error( "Exception saving https port", e );
        }
        saveFlags();
        saveSsh();
    }

    private void saveFlags() {
        StringBuilder sb = new StringBuilder();

        sb.append( "#!/bin/sh\n" );
        sb.append( HEADER + "\n" );
        sb.append( "## Set to true to enable\n" );
        sb.append( "## false or undefined is disabled.\n" );
        sb.append( FLAG_TCP_WIN + "=" + configuration.isTcpWindowScalingEnabled() + "\n\n" );
        sb.append( "## Allow inside HTTP true to enable\n" );
        sb.append( "## false or undefined is disabled.\n" );
        sb.append( FLAG_HTTP_IN + "=" + configuration.isInsideInsecureEnabled() + "\n\n" );
        sb.append( "## Allow outside HTTPS true to enable\n" );
        sb.append( "## false or undefined to disable.\n" );
        sb.append( FLAG_HTTPS_OUT + "=" + configuration.isOutsideAccessEnabled() + "\n\n" );
        sb.append( "## Restrict outside HTTPS access\n" );
        sb.append( "## True if restricted, undefined or false if unrestricted\n" );
        sb.append( FLAG_HTTPS_RES + "=" + configuration.isOutsideAccessRestricted() + "\n\n" );
        sb.append( "## Report exceptions\n" );
        sb.append( "## True to send out exception logs, undefined or false for not\n" );
        sb.append( FLAG_EXCEPTION + "=" + configuration.isExceptionReportingEnabled() + "\n\n" );

        if ( !configuration.outsideNetwork().isEmpty()) {
            IPaddr network = configuration.outsideNetwork();
            IPaddr netmask = configuration.outsideNetmask();

            sb.append( "## If outside access is enabled and restricted, only allow access from\n" );
            sb.append( "## this network.\n" );

            sb.append( FLAG_OUT_NET + "=" + network + "\n" );

            if ( !netmask.isEmpty()) {
                sb.append( FLAG_OUT_MASK + "=" + netmask + "\n" );
            }
            sb.append( "\n" );
        }

        if ( configuration.getPostConfigurationScript().length() > 0 ) {
            sb.append( "## Script to be executed after the bridge configuration script is executed\n" );
            sb.append( DECL_POST_CONF + "\n" );
            /* The post configuration script should be an object, allowing it to
             * be prevalidated */
            sb.append( configuration.getPostConfigurationScript().toString().trim() + "\n" );
            sb.append( "}\n" );

            sb.append( "## Flag to indicate that there is a post configuuration script\n" );
            sb.append( FLAG_POST_FUNC + "=" + POST_FUNC_NAME + "\n\n" );
        }

        writeFile( sb, BUNNICULA_CONF + FLAGS_CFG_FILE );
    }

    private void saveHttpsPort() throws Exception
    {

        /* rebind the https port */
        MvvmContextFactory.context().appServerManager().rebindExternalHttpsPort(
          configuration.httpsPort());

//        ((MvvmContextImpl)MvvmContextFactory.context()).getMain().
//            rebindExternalHttpsPort( configuration.httpsPort());

        Properties properties = new Properties();
        // if ( configuration.httpsPort() != NetworkingConfigurationImpl.DEF_HTTPS_PORT ) {
            /* Make sure to write the file anyway, this guarantees that if the property
             * is already set, it gets overwritten with an empty value */
        // }

        /* Maybe only store this value if it has been changed */
        properties.setProperty( PROPERTY_HTTPS_PORT, String.valueOf( configuration.httpsPort()));

        try {
            logger.debug( "Storing properties into: " + PROPERTY_FILE + "[" + configuration.httpsPort()
                          + "]" );
            properties.store( new FileOutputStream( new File( PROPERTY_FILE )), PROPERTY_COMMENT );
        } catch ( Exception e ) {
            logger.error( "Error saving HTTPS port" );
        }

        logger.debug( "Rebinding the HTTPS port" );
    }

    private void saveSsh()
    {
        try {
            if ( configuration.isSshEnabled()) {
                MvvmContextFactory.context().exec( SSH_ENABLE_SCRIPT );
            } else {
                MvvmContextFactory.context().exec( SSH_DISABLE_SCRIPT );
            }
        } catch ( Exception ex ) {
            logger.error( "Unable to configure ssh", ex );
        }
    }

    private void writeFile( StringBuilder sb, String fileName )
    {
        BufferedWriter out = null;

        /* Open up the interfaces file */
        try {
            String data = sb.toString();

            out = new BufferedWriter(new FileWriter( fileName ));
            out.write( data, 0, data.length());
        } catch ( Exception ex ) {
            /* XXX May need to catch this exception, restore defaults
             * then try again */
            logger.error( "Error writing file " + fileName + ":", ex );
        }

        close( out );
    }

    static NetworkingManagerImpl getInstance()
    {
        return INSTANCE;
    }

    private void close( BufferedReader buf )
    {
        try {
            if ( buf != null )
                buf.close();
        } catch ( Exception ex ) {
            logger.error( "Unable to close file", ex );
        }
    }

    private void close( BufferedWriter buf )
    {
        try {
            if ( buf != null )
                buf.close();
        } catch ( Exception ex ) {
            logger.error( "Unable to close file", ex );
        }
    }
    
    void buildIntfEnum()
    {
        IntfConverter converter = IntfConverter.getInstance();
        if ( converter == null ) { /* Running in fake mode */
            logger.info( "Running in fake mode, using internal and external" );
            intfEnum = new IntfEnum( new byte[]   { IntfConstants.EXTERNAL_INTF,
                                                    IntfConstants.INTERNAL_INTF },
                                     new String[] { IntfConstants.EXTERNAL,
                                                    IntfConstants.INTERNAL } );
            return;
        }

        byte[] argonIntfArray = converter.argonIntfArray();

        String[] intfNameArray = new String[argonIntfArray.length];

        for ( int c = 0; c < argonIntfArray.length ; c++ ) {
            String name = "unknown";
            byte intf = argonIntfArray[c];
            switch ( intf ) {
            case IntfConstants.EXTERNAL_INTF: name = IntfConstants.EXTERNAL; break;
            case IntfConstants.INTERNAL_INTF: name = IntfConstants.INTERNAL; break;
            case IntfConstants.DMZ_INTF:      name = IntfConstants.DMZ;      break;
            case IntfConstants.VPN_INTF:      name = IntfConstants.VPN;      break;
            default:
                logger.error( "Unknown interface: " + intf + " using unknown" );
            }

            intfNameArray[c] = name;
        }

        intfEnum = new IntfEnum( argonIntfArray, intfNameArray );

        IntfMatcherFactory.getInstance().updateEnumeration( intfEnum );
    }
}
