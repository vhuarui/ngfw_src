/**
 * $Id$
 */
package com.untangle.node.openvpn;

import java.net.InetAddress;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;
import com.untangle.uvm.node.NodeSettings;

/**
 * Settings for the open vpn node.
 */
@SuppressWarnings("serial")
public class VpnSettings implements Serializable
{
    private static final String INVALID_CHARACTERS_STRING = "[^-a-zA-Z0-9- ]";
    private static final Pattern INVALID_CHARACTERS_PATTERN;

    private static final String MULTISPACE_STRING = " +";
    private static final Pattern MULTISPACE_PATTERN;

    private static final String DEFAULT_SITE_NAME = "untangle-vpn";

    static private final int KEY_SIZE_ENUMERATION[] = new int[]
        {
            1024, 1152, 1280, 1408,
            1536, 1664, 1792, 1920,
            2048
        };

    private static final int KEY_SIZE_DEFAULT    = KEY_SIZE_ENUMERATION[4];
    public static final int DEFAULT_PUBLIC_PORT = 1194;

    private Long id;

    private boolean isUntanglePlatformClient = false;

    /* The virtual address of the vpn server, or the address of the server to connect to. */
    private InetAddress serverAddress;

    /* List of addresses that should be visible to the VPN */
    private List<SiteNetwork> exportedAddressList;

    private boolean keepAlive;

    private boolean exposeClients;

    private int maxClients = 500;

    private List<VpnGroup> groupList;
    private List<VpnClient> clientList;
    private List<VpnSite> siteList;

    private boolean isDnsOverrideEnabled = false;
    private InetAddress dns1;
    private InetAddress dns2;

    /* Certificate information */
    private String  domain = "";
    private int     keySize = KEY_SIZE_DEFAULT;
    private String  country = "";
    private String  locality = "";
    private String  province = "";
    private String  organization = "";
    private String  organizationUnit = "";
    private String  email;
    private boolean caKeyOnUsb;
    
    /* This is the name of the site for distinguishing the VPN client on user machines */
    private String siteName = "";

    public VpnSettings() { }

    /* Typically private, but package access so the ID can be reused */

    Long getId()
    {
        return id;
    }

    void setId( Long id )
    {
        this.id = id;
    }

    /**
     * @return whether this is an openvpn of another edgeguard client.
     */
    public boolean isUntanglePlatformClient()
    {
        return this.isUntanglePlatformClient;
    }

    public void setUntanglePlatformClient( boolean isUntanglePlatformClient )
    {
        this.isUntanglePlatformClient = isUntanglePlatformClient;
    }

    /**
     * The list of VPN groups associated with this vpn configuration.
     * ??? This may just be infrastructure for down the line, and the
     * current GUI may only support one address group.
     *
     * @return the list of vpn address groups.
     */
    public List<VpnGroup> getGroupList()
    {
        if ( this.groupList == null ) this.groupList = new LinkedList<VpnGroup>();

        if (this.groupList != null) this.groupList.removeAll(java.util.Collections.singleton(null));
        return this.groupList;
    }

    public void setGroupList( List<VpnGroup> groupList )
    {
        this.groupList = groupList;
    }

    /**
     * The list of VPN clients.
     *
     * @return the list of Patterns
     */
    public List<VpnClient> getClientList()
    {
        if ( this.clientList == null ) this.clientList = new LinkedList<VpnClient>();

        if (this.clientList != null) this.clientList.removeAll(java.util.Collections.singleton(null));
        return this.clientList;
    }

    public void setClientList( List<VpnClient> clientList )
    {
        this.clientList = clientList;
    }

    /**
     * The list of VPN clients.
     *
     * @return the list of Patterns
     */
    public List<VpnSite> getSiteList()
    {
        if ( this.siteList == null ) this.siteList = new LinkedList<VpnSite>();

        if (this.siteList != null) this.siteList.removeAll(java.util.Collections.singleton(null));
        return this.siteList;
    }

    public void setSiteList( List<VpnSite> siteList )
    {
        this.siteList = siteList;
    }

    /**
     * True if DNS override is enabled.
     * This determines if the user specified DNS servers should be used as opposed to the
     * default ones from the UVM.
     * @return whether or not to override DNS
     */
    public boolean getIsDnsOverrideEnabled()
    {
        return this.isDnsOverrideEnabled;
    }

    public void setIsDnsOverrideEnabled( boolean newValue )
    {
        this.isDnsOverrideEnabled = newValue;
    }

    public InetAddress getDns1()
    {
        return this.dns1;
    }

    public void setDns1( InetAddress newValue )
    {
        this.dns1 = newValue;
    }

    public InetAddress getDns2()
    {
        return this.dns2;
    }

    public void setDns2( InetAddress newValue )
    {
        this.dns2 = newValue;
    }

    public List<InetAddress> trans_getDnsServerList()
    {
        List<InetAddress> dnsServerList = new LinkedList<InetAddress>();

        if ( this.dns1 != null ) dnsServerList.add( this.dns1 );
        if ( this.dns2 != null ) dnsServerList.add( this.dns2 );

        return dnsServerList;
    }

    /**
     * @return a new list containing all of the clients and the
     * sites. A VpnSite is a subclass of a VpnClient.
     */
    public List<VpnClient> trans_getCompleteClientList()
    {
        List<VpnClient> clientList = getClientList();
        List<VpnSite> siteList = getSiteList();
        List<VpnClient> completeList = new ArrayList<VpnClient>( clientList.size() + siteList.size());
        completeList.addAll( clientList );
        completeList.addAll( siteList );
        return completeList;
    }

    /**
     * Static address for the openvpn server.
     *
     * @return virtual address of the open vpn server.
     */
    public InetAddress getServerAddress()
    {
        return this.serverAddress;
    }

    public void setServerAddress( InetAddress serverAddress )
    {
        this.serverAddress = serverAddress;
    }

    /**
     * The list of exported networks for this site.
     *
     * @return the list of exported networks for this site.
     */
    public List<SiteNetwork> getExportedAddressList()
    {
        if ( this.exportedAddressList == null ) this.exportedAddressList = new LinkedList<SiteNetwork>();

        if (this.exportedAddressList != null) this.exportedAddressList.removeAll(java.util.Collections.singleton(null));
        return this.exportedAddressList;
    }

    public void setExportedAddressList( List<SiteNetwork> exportedAddressList )
    {
        this.exportedAddressList = exportedAddressList;
    }

    /**
     * True if clients should be allowed to see other clients
     * @return whether the vpn is in bridge mode.
     */
    public boolean getExposeClients()
    {
        return this.exposeClients;
    }

    public void setExposeClients( boolean exposeClients )
    {
        this.exposeClients = exposeClients;
    }

    /**
     * True if clients should keep the connection alive with pings. (may want to hide this from the user)
     * @return keep alive
     */
    public boolean getKeepAlive()
    {
        return this.keepAlive;
    }

    public void setKeepAlive( boolean keepAlive )
    {
        this.keepAlive = keepAlive;
    }

    /**
     * @return Maximum number of concurrent clients.(probably not exposed)
     */
    public int getMaxClients()
    {
        return this.maxClients;
    }

    public void setMaxClients( int maxClients )
    {
        this.maxClients = maxClients;
    }

    /* Certificate information */

    /**
     * @return domain.
     */
    public String getDomain()
    {
        return this.domain;
    }

    public void setDomain( String domain )
    {
        this.domain = domain;
    }

    /**
     * @return key size.
     */
    public int getKeySize()
    {
        return this.keySize;
    }

    public void setKeySize( int keySize )
    {
        this.keySize = keySize;
    }

    public static int[] getKeySizeEnumeration()
    {
        return KEY_SIZE_ENUMERATION;
    }

    public static int getKeySizeDefault()
    {
        return KEY_SIZE_DEFAULT;
    }

    /**
     * @return country.
     */
    public String getCountry()
    {
        return this.country;
    }

    public void setCountry( String country )
    {
        this.country = country;
    }

    /**
     * @return province.
     */
    public String getProvince()
    {
        return this.province;
    }

    public void setProvince( String province )
    {
        this.province = province;
    }

    /**
     * @return locality(city).
     */
    public String getLocality()
    {
        return this.locality;
    }

    public void setLocality( String locality )
    {
        this.locality = locality;
    }

    /**
     * @return organization.
     */
    public String getOrganization()
    {
        return this.organization;
    }

    public void setOrganization( String organization )
    {
        this.organization = organization;
    }

    /**
     * @return organizationUnit.
     */
    public String getOrganizationUnit()
    {
        return organizationUnit;
    }

    public void setOrganizationUnit( String organizationUnit )
    {
        this.organizationUnit = organizationUnit;
    }

    /**
     * @return true if the settings have been configured
     */
    boolean trans_isConfigured()
    {
        if ( isUntanglePlatformClient ) return true;
        return ( !( this.organizationUnit == null ) && ( this.organizationUnit.length() > 0 ));
    }

    /**
     * @return email.
     */
    public String getEmail()
    {
        return this.email;
    }

    public void setEmail( String email )
    {
        this.email = email;
    }

    /**
     * @return true if the CA private key is on a USB key.
     */
    public boolean getCaKeyOnUsb()
    {
        return this.caKeyOnUsb;
    }

    public void setCaKeyOnUsb( boolean caKeyOnUsb )
    {
        this.caKeyOnUsb = caKeyOnUsb;
    }

    public String getSiteName()
    {
        if ( this.siteName == null ) this.siteName = DEFAULT_SITE_NAME;

        this.siteName = this.siteName.trim();

        if ( this.siteName.length() == 0 ) this.siteName = DEFAULT_SITE_NAME;

        return this.siteName;
    }

    public void setSiteName( String newValue )
    {
        if ( newValue == null ) newValue = DEFAULT_SITE_NAME;
        newValue = newValue.trim();
        if ( newValue.length() == 0 ) newValue = DEFAULT_SITE_NAME;
        this.siteName = newValue;
    }

    /**
     * Name of this VPN site.  This is the value that identifies this
     * office in the config file */
    public String trans_getInternalSiteName()
    {
        String site = getSiteName();

        /* try using the organization if the site name is not intialized */
        if ( DEFAULT_SITE_NAME.equals( site )) site = this.organization;

        /* fall back to the site name if necessary */
        if ( site == null ) site = DEFAULT_SITE_NAME;
        site = site.trim();
        if ( site.length() == 0 ) site = DEFAULT_SITE_NAME;

        /* can't substitute the bad characters */
        if (( null == INVALID_CHARACTERS_PATTERN ) || ( null == MULTISPACE_PATTERN )) {
            return DEFAULT_SITE_NAME;
        }

        site = site.toLowerCase();

        /* get rid of the invalid characters */
        site = INVALID_CHARACTERS_PATTERN.matcher( site ).replaceAll( "" );

        /* Trim off whitespace again */
        site = site.trim();

        /* replace all of the spaces with dashes */
        site = MULTISPACE_PATTERN.matcher( site ).replaceAll( "-" );

        return site;
    }

    static
    {
        Pattern pattern = null;

        try {
            pattern = Pattern.compile( INVALID_CHARACTERS_STRING );
        } catch ( PatternSyntaxException e ) {
            System.err.println( "Unable to compile pattern, using null" );
            pattern = null;
        }

        INVALID_CHARACTERS_PATTERN = pattern;

        try {
            pattern = Pattern.compile( MULTISPACE_STRING );
        } catch ( PatternSyntaxException e ) {
            System.err.println( "Unable to compile pattern, using null" );
            pattern = null;
        }

        MULTISPACE_PATTERN = pattern;

    }
}
