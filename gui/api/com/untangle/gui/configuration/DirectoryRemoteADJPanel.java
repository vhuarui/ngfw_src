/*
 * $HeadURL$
 * Copyright (c) 2003-2007 Untangle, Inc.
 *
 * This library is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License, version 2,
 * as published by the Free Software Foundation.
 *
 * This library is distributed in the hope that it will be useful, but
 * AS-IS and WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE, TITLE, or
 * NONINFRINGEMENT.  See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * Linking this library statically or dynamically with other modules is
 * making a combined work based on this library.  Thus, the terms and
 * conditions of the GNU General Public License cover the whole combination.
 *
 * As a special exception, the copyright holders of this library give you
 * permission to link this library with independent modules to produce an
 * executable, regardless of the license terms of these independent modules,
 * and to copy and distribute the resulting executable under terms of your
 * choice, provided that you also meet, for each linked independent module,
 * the terms and conditions of the license of that module.  An independent
 * module is a module which is not derived from or based on this library.
 * If you modify this library, you may extend this exception to your version
 * of the library, but you are not obligated to do so.  If you do not wish
 * to do so, delete this exception statement from your version.
 */

package com.untangle.gui.configuration;

import java.awt.*;
import java.net.URL;
import java.util.Vector;
import javax.jnlp.BasicService;
import javax.jnlp.ServiceManager;
import javax.swing.*;

import com.untangle.gui.node.*;
import com.untangle.gui.util.*;
import com.untangle.gui.widgets.dialogs.*;
import com.untangle.uvm.*;
import com.untangle.uvm.addrbook.*;
import com.untangle.uvm.node.*;
import com.untangle.uvm.node.firewall.user.UserMatcherConstants;
import com.untangle.uvm.security.*;
import com.untangle.uvm.snmp.*;
import com.untangle.uvm.user.WMISettings;

public class DirectoryRemoteADJPanel extends javax.swing.JPanel
    implements Savable<DirectoryCompoundSettings>, Refreshable<DirectoryCompoundSettings>, Changeable {

    private static final String EXCEPTION_PASSWORD_MISSING = "A \"Password\" must be specified if a \"Login\" is specified.";
    private static final String EXCEPTION_LOGIN_MISSING    = "A \"Login\" must be specified if a \"Password\" is specified.";
    private static final String EXCEPTION_HOSTNAME_MISSING = "A \"Hostname\" must be specified if \"Login\" or \"Password\" are specified.";
    private static final String EXCEPTION_DOMAIN_MISSING   = "A \"Search Base\" must be specified.";
    private static final String EXCEPTION_ORG_MISSING   = "An \"Active Directory Organization\" must be specified.";
    private static final String EXCEPTION_SERVER_ADDRESS   = "You must specify a valid IP address for your Lookup Server.";
    private static final String EXCEPTION_DOMAIN_PASSWORD  = "A \"Domain Password\" must be specified if a \"Domain Login\" is specified.";
    private static final String EXCEPTION_DOMAIN_LOGIN     = "A \"Domain Login\" must be specified if a \"Domain Password\" is specified.";

    public static final String ANY_USER = UserMatcherConstants.MARKER_ANY;
    public static final String MULTIPLE_USERS = "[multiple selections]";

    public DirectoryRemoteADJPanel() {
        initComponents();
        Util.setPortView(portJSpinner, 25);
        Util.addPanelFocus(this, adDisabledJRadioButton);
        Util.addFocusHighlight(hostJTextField);
        Util.addFocusHighlight(portJSpinner);
        Util.addFocusHighlight(loginJTextField);
        Util.addFocusHighlight(passwordJPasswordField);
        Util.addFocusHighlight(baseJTextField);
        Util.addFocusHighlight(orgJTextField);
    }

    // SETTINGS CHANGE NOTIFICATION /////////
    private SettingsChangedListener settingsChangedListener;
    public void setSettingsChangedListener(SettingsChangedListener settingsChangedListener){
        this.settingsChangedListener = settingsChangedListener;
    }
    ///////////////////////////////////////////

    public void doSave(DirectoryCompoundSettings directoryCompoundSettings, boolean validateOnly) throws Exception {

        // ENABLED //
        boolean enabled = adEnabledJRadioButton.isSelected();

        // HOSTNAME ///////
        String host = hostJTextField.getText();

        // PORT //////
        int port = 0;
        if( enabled ){
            ((JSpinner.DefaultEditor)portJSpinner.getEditor()).getTextField().setBackground(Color.WHITE);
            try{ portJSpinner.commitEdit(); }
            catch(Exception e){
                ((JSpinner.DefaultEditor)portJSpinner.getEditor()).getTextField().setBackground(Util.INVALID_BACKGROUND_COLOR);
                throw new Exception(Util.EXCEPTION_PORT_RANGE);
            }
            port = (Integer) portJSpinner.getValue();
        }

        // LOGIN /////
        String login = loginJTextField.getText();

        // PASSWORD /////
        String password = new String(passwordJPasswordField.getPassword());

        // DOMAIN /////
        String domain = baseJTextField.getText();

        // ORG //
        String org = orgJTextField.getText();

        if( enabled ){
            // CHECK THAT BOTH PASSWORD AND LOGIN ARE FILLED OR UNFILLED /////
            passwordJPasswordField.setBackground( Color.WHITE );
            loginJTextField.setBackground( Color.WHITE );
            if( (login.length() > 0) && (password.length() == 0) ){
                passwordJPasswordField.setBackground( Util.INVALID_BACKGROUND_COLOR );
                throw new Exception(EXCEPTION_PASSWORD_MISSING);
            }
            else if( (login.length() == 0) && (password.length() > 0) ){
                loginJTextField.setBackground( Util.INVALID_BACKGROUND_COLOR );
                throw new Exception(EXCEPTION_LOGIN_MISSING);
            }

            // CHECK THAT IF EITHER LOGIN OR PASSWORD ARE FILLED, A HOSTNAME IS GIVEN
            hostJTextField.setBackground( Color.WHITE );
            if( (login.length() > 0) && (password.length() > 0) && (host.length() == 0) ){
                hostJTextField.setBackground( Util.INVALID_BACKGROUND_COLOR );
                throw new Exception(EXCEPTION_HOSTNAME_MISSING);
            }

            // CHECK THAT A DOMAIN IS SUPPLIED
            baseJTextField.setBackground( Color.WHITE );
            if( domain.length() == 0 ){
                baseJTextField.setBackground( Util.INVALID_BACKGROUND_COLOR );
                throw new Exception(EXCEPTION_DOMAIN_MISSING);
            }

            // CHECK THAT A ORG IS SUPPLIED
            orgJTextField.setBackground( Color.WHITE );
            if( org.length() == 0 ){
                orgJTextField.setBackground( Util.INVALID_BACKGROUND_COLOR );
                throw new Exception(EXCEPTION_ORG_MISSING);
            }

        }

        // SAVE SETTINGS ////////////
        if( !validateOnly ){
            if( enabled ){
                directoryCompoundSettings.setAddressBookConfiguration( AddressBookConfiguration.AD_AND_LOCAL );
                RepositorySettings repositorySettings = directoryCompoundSettings.getAddressBookSettings().getADRepositorySettings();
                repositorySettings.setSuperuser( login );
                repositorySettings.setSuperuserPass( password );
                repositorySettings.setLDAPHost( host );
                repositorySettings.setLDAPPort( port );
                repositorySettings.setDomain( domain );
                repositorySettings.setOUFilter( org );
            }
            else{
                directoryCompoundSettings.setAddressBookConfiguration( AddressBookConfiguration.LOCAL_ONLY );
            }
        }

    }

    private boolean enabledCurrent;
    private String hostCurrent;
    private int portCurrent;
    private String loginCurrent;
    private String passwordCurrent;
    private String domainCurrent;
    private String orgCurrent;
    private boolean serverEnabledCurrent;
    private String serverAddressCurrent;
    private String serverURLCurrent;
    private boolean domainEnabledCurrent;
    private String domainLoginCurrent;
    private String domainPasswordCurrent;

    public void doRefresh(DirectoryCompoundSettings directoryCompoundSettings){
        RepositorySettings repositorySettings = directoryCompoundSettings.getAddressBookSettings().getADRepositorySettings();
        AddressBookConfiguration addressBookConfiguration = directoryCompoundSettings.getAddressBookConfiguration();

        // AD ENABLED //
        enabledCurrent = addressBookConfiguration.equals( AddressBookConfiguration.AD_AND_LOCAL );
        if( enabledCurrent )
            adEnabledJRadioButton.setSelected( true );
        else
            adDisabledJRadioButton.setSelected( true );
        adEnabledDependency( enabledCurrent );
        Util.addSettingChangeListener(settingsChangedListener, this, adEnabledJRadioButton);
        Util.addSettingChangeListener(settingsChangedListener, this, adDisabledJRadioButton);

        // HOST /////
        hostCurrent = repositorySettings.getLDAPHost();
        hostJTextField.setText( hostCurrent );
        hostJTextField.setBackground( Color.WHITE );
        Util.addSettingChangeListener(settingsChangedListener, this, hostJTextField);

        // PORT /////
        portCurrent = repositorySettings.getLDAPPort();
        portJSpinner.setValue( portCurrent );
        ((JSpinner.DefaultEditor)portJSpinner.getEditor()).getTextField().setText(Integer.toString(portCurrent));
        ((JSpinner.DefaultEditor)portJSpinner.getEditor()).getTextField().setBackground(Color.WHITE);
        Util.addSettingChangeListener(settingsChangedListener, this, portJSpinner);

        // LOGIN //////
        loginCurrent = repositorySettings.getSuperuser();
        loginJTextField.setText( loginCurrent );
        loginJTextField.setBackground( Color.WHITE );
        Util.addSettingChangeListener(settingsChangedListener, this, loginJTextField);

        // PASSWORD /////
        passwordCurrent = repositorySettings.getSuperuserPass();
        passwordJPasswordField.setText( passwordCurrent );
        passwordJPasswordField.setBackground( Color.WHITE );
        Util.addSettingChangeListener(settingsChangedListener, this, passwordJPasswordField);

        // DOMAIN //////
        domainCurrent = repositorySettings.getDomain();
        baseJTextField.setText( domainCurrent );
        baseJTextField.setBackground( Color.WHITE );
        Util.addSettingChangeListener(settingsChangedListener, this, baseJTextField);

        // ORG //
        orgCurrent = repositorySettings.getOUFilter();
        orgJTextField.setText( orgCurrent );
        orgJTextField.setBackground( Color.WHITE );
        Util.addSettingChangeListener(settingsChangedListener, this, orgJTextField);

        // SERVER ENABLED
        serverEnabledCurrent = directoryCompoundSettings.getWMISettings().getIsEnabled();

        // DOMAIN LOGIN & PASSWORD
        domainLoginCurrent = directoryCompoundSettings.getWMISettings().getUsername();
        domainPasswordCurrent = directoryCompoundSettings.getWMISettings().getPassword();
        if( (domainLoginCurrent.equals(loginCurrent))&&(domainPasswordCurrent.equals(passwordCurrent)) )
            domainEnabledCurrent = false;
        else
            domainEnabledCurrent = true;

        // SERVER URL
        serverURLCurrent = directoryCompoundSettings.getWMISettings().getUrl();
    }


    private class UserEntryWrapper extends JCheckBox implements Comparable<UserEntryWrapper>{
        private UserEntry userEntry;
        public UserEntryWrapper(UserEntry userEntry){
            this.userEntry = userEntry;
            setText(toString());
            setSelected(false);
            setOpaque(false);
        }

        public String toString(){
            if(userEntry==null)
                return ANY_USER;
            String repository;
            switch(userEntry.getStoredIn()){
            case MS_ACTIVE_DIRECTORY : repository = "Active Directory";
                break;
            case LOCAL_DIRECTORY : repository = "Local";
                break;
            default:
            case NONE : repository = "UNKNOWN";
                break;
            }
            return userEntry.getUID() + " (" + repository + ")";
        }
        public String getUID(){
            if(userEntry!=null)
                return userEntry.getUID();
            else
                return ANY_USER;
        }
        public UserEntry getUserEntry(){
            return userEntry;
        }

        public boolean equals(Object obj){
            if( ! (obj instanceof UserEntryWrapper) )
                return false;
            else if(userEntry==null)
                return false;
            UserEntry other = ((UserEntryWrapper) obj).getUserEntry();
            return getUserEntry().equals(other);
        }

        public int compareTo(UserEntryWrapper userEntryWrapper){
            if(userEntry==null)
                return -1;
            else if(userEntryWrapper.userEntry==null)
                return 1;
            switch(userEntry.getStoredIn().compareTo(userEntryWrapper.userEntry.getStoredIn())){
            case -1 :
                return -1;
            case 1 :
                return 1;
            default:
            case 0 :
                return userEntry.getUID().compareTo(userEntryWrapper.userEntry.getUID());
            }
        }
    }
    // <editor-fold defaultstate="collapsed" desc=" Generated Code ">//GEN-BEGIN:initComponents
    private void initComponents() {
        java.awt.GridBagConstraints gridBagConstraints;

        adButtonGroup = new javax.swing.ButtonGroup();
        serverButtonGroup = new javax.swing.ButtonGroup();
        externalRemoteJPanel = new javax.swing.JPanel();
        enableRemoteJPanel = new javax.swing.JPanel();
        serverJLabel1 = new javax.swing.JLabel();
        adDisabledJRadioButton = new javax.swing.JRadioButton();
        adEnabledJRadioButton = new javax.swing.JRadioButton();
        helpJButton = new javax.swing.JButton();
        restrictIPJPanel = new javax.swing.JPanel();
        hostJLabel = new javax.swing.JLabel();
        hostJTextField = new javax.swing.JTextField();
        portJLabel = new javax.swing.JLabel();
        portJSpinner = new javax.swing.JSpinner();
        loginJLabel = new javax.swing.JLabel();
        loginJTextField = new javax.swing.JTextField();
        passwordJLabel = new javax.swing.JLabel();
        passwordJPasswordField = new javax.swing.JPasswordField();
        jSeparator2 = new javax.swing.JSeparator();
        restrictIPJPanel1 = new javax.swing.JPanel();
        baseJLabel = new javax.swing.JLabel();
        baseJTextField = new javax.swing.JTextField();
        orgJLabel = new javax.swing.JLabel();
        orgJTextField = new javax.swing.JTextField();
        jSeparator3 = new javax.swing.JSeparator();
        testJLabel = new javax.swing.JLabel();
        adTestJButton = new javax.swing.JButton();
        jSeparator4 = new javax.swing.JSeparator();
        jPanel1 = new javax.swing.JPanel();
        jButton1 = new javax.swing.JButton();
        jScrollPane1 = new javax.swing.JScrollPane();
        jList1 = new javax.swing.JList();
        jSeparator5 = new javax.swing.JSeparator();
        jPanel2 = new javax.swing.JPanel();
        jButton2 = new javax.swing.JButton();

        setLayout(new java.awt.GridBagLayout());

        setMaximumSize(new java.awt.Dimension(563, 687));
        setMinimumSize(new java.awt.Dimension(563, 687));
        setPreferredSize(new java.awt.Dimension(563, 687));
        externalRemoteJPanel.setLayout(new java.awt.GridBagLayout());

        externalRemoteJPanel.setBorder(javax.swing.BorderFactory.createTitledBorder(null, "Active Directory (AD) Server", javax.swing.border.TitledBorder.DEFAULT_JUSTIFICATION, javax.swing.border.TitledBorder.DEFAULT_POSITION, new java.awt.Font("Dialog", 1, 16)));
        enableRemoteJPanel.setLayout(new java.awt.GridBagLayout());

        serverJLabel1.setFont(new java.awt.Font("Dialog", 0, 12));
        serverJLabel1.setText("<html>This allows your server to connect to an <b>Active Directory Server</b> in order to recognize various users for use in reporting, firewall, router, policies, etc.</html>");
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.fill = java.awt.GridBagConstraints.HORIZONTAL;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.WEST;
        gridBagConstraints.insets = new java.awt.Insets(0, 10, 10, 0);
        enableRemoteJPanel.add(serverJLabel1, gridBagConstraints);

        adButtonGroup.add(adDisabledJRadioButton);
        adDisabledJRadioButton.setFont(new java.awt.Font("Dialog", 0, 12));
        adDisabledJRadioButton.setSelected(true);
        adDisabledJRadioButton.setText("<html><b>Disabled</b></html>");
        adDisabledJRadioButton.setActionCommand("<html><b>Use DHCP</b> to automatically set Untangle's IP address from the network's DHCP server.</html>");
        adDisabledJRadioButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                adDisabledJRadioButtonActionPerformed(evt);
            }
        });

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.fill = java.awt.GridBagConstraints.HORIZONTAL;
        gridBagConstraints.weightx = 1.0;
        gridBagConstraints.insets = new java.awt.Insets(0, 50, 0, 0);
        enableRemoteJPanel.add(adDisabledJRadioButton, gridBagConstraints);

        adButtonGroup.add(adEnabledJRadioButton);
        adEnabledJRadioButton.setFont(new java.awt.Font("Dialog", 0, 12));
        adEnabledJRadioButton.setText("<html><b>Enabled</b></html>");
        adEnabledJRadioButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                adEnabledJRadioButtonActionPerformed(evt);
            }
        });

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.fill = java.awt.GridBagConstraints.HORIZONTAL;
        gridBagConstraints.weightx = 1.0;
        gridBagConstraints.insets = new java.awt.Insets(0, 50, 0, 0);
        enableRemoteJPanel.add(adEnabledJRadioButton, gridBagConstraints);

        helpJButton.setFont(new java.awt.Font("Dialog", 0, 12));
        helpJButton.setIcon(new javax.swing.ImageIcon(getClass().getResource("/com/untangle/gui/images/IconHelp_18x16.png")));
        helpJButton.setText("Help");
        helpJButton.setIconTextGap(6);
        helpJButton.setMargin(new java.awt.Insets(4, 8, 4, 8));
        helpJButton.setOpaque(false);
        helpJButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                helpJButtonActionPerformed(evt);
            }
        });

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.gridy = 3;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.EAST;
        gridBagConstraints.insets = new java.awt.Insets(0, 0, 0, 10);
        enableRemoteJPanel.add(helpJButton, gridBagConstraints);

        restrictIPJPanel.setLayout(new java.awt.GridBagLayout());

        hostJLabel.setFont(new java.awt.Font("Dialog", 0, 12));
        hostJLabel.setText("AD Server IP or Hostname:");
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.gridy = 0;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.EAST;
        restrictIPJPanel.add(hostJLabel, gridBagConstraints);

        hostJTextField.setMaximumSize(new java.awt.Dimension(200, 19));
        hostJTextField.setMinimumSize(new java.awt.Dimension(200, 19));
        hostJTextField.setPreferredSize(new java.awt.Dimension(200, 19));
        hostJTextField.addCaretListener(new javax.swing.event.CaretListener() {
            public void caretUpdate(javax.swing.event.CaretEvent evt) {
                hostJTextFieldCaretUpdate(evt);
            }
        });

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 1;
        gridBagConstraints.gridy = 0;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.WEST;
        gridBagConstraints.insets = new java.awt.Insets(0, 0, 2, 0);
        restrictIPJPanel.add(hostJTextField, gridBagConstraints);

        portJLabel.setFont(new java.awt.Font("Dialog", 0, 12));
        portJLabel.setText("Port:");
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.gridy = 1;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.EAST;
        restrictIPJPanel.add(portJLabel, gridBagConstraints);

        portJSpinner.setFont(new java.awt.Font("Dialog", 0, 12));
        portJSpinner.setMaximumSize(new java.awt.Dimension(75, 19));
        portJSpinner.setMinimumSize(new java.awt.Dimension(75, 19));
        portJSpinner.setPreferredSize(new java.awt.Dimension(75, 19));
        portJSpinner.addChangeListener(new javax.swing.event.ChangeListener() {
            public void stateChanged(javax.swing.event.ChangeEvent evt) {
                portJSpinnerStateChanged(evt);
            }
        });

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 1;
        gridBagConstraints.gridy = 1;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.WEST;
        gridBagConstraints.insets = new java.awt.Insets(0, 0, 2, 0);
        restrictIPJPanel.add(portJSpinner, gridBagConstraints);

        loginJLabel.setFont(new java.awt.Font("Dialog", 0, 12));
        loginJLabel.setText("Authentication Login:");
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.gridy = 2;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.EAST;
        restrictIPJPanel.add(loginJLabel, gridBagConstraints);

        loginJTextField.setMaximumSize(new java.awt.Dimension(150, 19));
        loginJTextField.setMinimumSize(new java.awt.Dimension(150, 19));
        loginJTextField.setPreferredSize(new java.awt.Dimension(150, 19));
        loginJTextField.addCaretListener(new javax.swing.event.CaretListener() {
            public void caretUpdate(javax.swing.event.CaretEvent evt) {
                loginJTextFieldCaretUpdate(evt);
            }
        });

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 1;
        gridBagConstraints.gridy = 2;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.WEST;
        gridBagConstraints.insets = new java.awt.Insets(0, 0, 2, 0);
        restrictIPJPanel.add(loginJTextField, gridBagConstraints);

        passwordJLabel.setFont(new java.awt.Font("Dialog", 0, 12));
        passwordJLabel.setText("Authentication Password:");
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.gridy = 3;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.EAST;
        restrictIPJPanel.add(passwordJLabel, gridBagConstraints);

        passwordJPasswordField.setMaximumSize(new java.awt.Dimension(150, 19));
        passwordJPasswordField.setMinimumSize(new java.awt.Dimension(150, 19));
        passwordJPasswordField.setPreferredSize(new java.awt.Dimension(150, 19));
        passwordJPasswordField.addCaretListener(new javax.swing.event.CaretListener() {
            public void caretUpdate(javax.swing.event.CaretEvent evt) {
                passwordJPasswordFieldCaretUpdate(evt);
            }
        });

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 1;
        gridBagConstraints.gridy = 3;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.WEST;
        gridBagConstraints.insets = new java.awt.Insets(0, 0, 2, 0);
        restrictIPJPanel.add(passwordJPasswordField, gridBagConstraints);

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.gridy = 3;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.WEST;
        gridBagConstraints.weightx = 1.0;
        gridBagConstraints.insets = new java.awt.Insets(0, 114, 5, 0);
        enableRemoteJPanel.add(restrictIPJPanel, gridBagConstraints);

        jSeparator2.setForeground(new java.awt.Color(200, 200, 200));
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.fill = java.awt.GridBagConstraints.HORIZONTAL;
        enableRemoteJPanel.add(jSeparator2, gridBagConstraints);

        restrictIPJPanel1.setLayout(new java.awt.GridBagLayout());

        baseJLabel.setFont(new java.awt.Font("Dialog", 0, 12));
        baseJLabel.setText("Active Directory Domain:");
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.gridy = 0;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.EAST;
        restrictIPJPanel1.add(baseJLabel, gridBagConstraints);

        baseJTextField.setMaximumSize(new java.awt.Dimension(200, 19));
        baseJTextField.setMinimumSize(new java.awt.Dimension(200, 19));
        baseJTextField.setPreferredSize(new java.awt.Dimension(200, 19));
        baseJTextField.addCaretListener(new javax.swing.event.CaretListener() {
            public void caretUpdate(javax.swing.event.CaretEvent evt) {
                baseJTextFieldCaretUpdate(evt);
            }
        });

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 1;
        gridBagConstraints.gridy = 0;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.WEST;
        restrictIPJPanel1.add(baseJTextField, gridBagConstraints);

        orgJLabel.setFont(new java.awt.Font("Dialog", 0, 12));
        orgJLabel.setText("Active Directory Organization:");
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.gridy = 1;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.EAST;
        gridBagConstraints.insets = new java.awt.Insets(2, 0, 0, 0);
        restrictIPJPanel1.add(orgJLabel, gridBagConstraints);

        orgJTextField.setMaximumSize(new java.awt.Dimension(200, 19));
        orgJTextField.setMinimumSize(new java.awt.Dimension(200, 19));
        orgJTextField.setPreferredSize(new java.awt.Dimension(200, 19));
        orgJTextField.addCaretListener(new javax.swing.event.CaretListener() {
            public void caretUpdate(javax.swing.event.CaretEvent evt) {
                orgJTextFieldCaretUpdate(evt);
            }
        });

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 1;
        gridBagConstraints.gridy = 1;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.WEST;
        gridBagConstraints.insets = new java.awt.Insets(2, 0, 0, 0);
        restrictIPJPanel1.add(orgJTextField, gridBagConstraints);

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.WEST;
        gridBagConstraints.weightx = 1.0;
        gridBagConstraints.insets = new java.awt.Insets(5, 87, 5, 0);
        enableRemoteJPanel.add(restrictIPJPanel1, gridBagConstraints);

        jSeparator3.setForeground(new java.awt.Color(200, 200, 200));
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.fill = java.awt.GridBagConstraints.HORIZONTAL;
        enableRemoteJPanel.add(jSeparator3, gridBagConstraints);

        testJLabel.setFont(new java.awt.Font("Dialog", 0, 12));
        testJLabel.setText("<html>The <b>Active Directory Test</b> can be used to test that your settings above are correct.</html>");
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.fill = java.awt.GridBagConstraints.HORIZONTAL;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.WEST;
        gridBagConstraints.insets = new java.awt.Insets(10, 10, 10, 0);
        enableRemoteJPanel.add(testJLabel, gridBagConstraints);

        adTestJButton.setFont(new java.awt.Font("Dialog", 0, 12));
        adTestJButton.setIcon(new javax.swing.ImageIcon(getClass().getResource("/com/untangle/gui/images/IconTest_16x16.png")));
        adTestJButton.setText("Active Directory Test");
        adTestJButton.setMargin(new java.awt.Insets(4, 8, 4, 8));
        adTestJButton.setMaximumSize(null);
        adTestJButton.setMinimumSize(null);
        adTestJButton.setPreferredSize(null);
        adTestJButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                adTestJButtonActionPerformed(evt);
            }
        });

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.insets = new java.awt.Insets(0, 0, 5, 0);
        enableRemoteJPanel.add(adTestJButton, gridBagConstraints);

        jSeparator4.setForeground(new java.awt.Color(200, 200, 200));
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.fill = java.awt.GridBagConstraints.HORIZONTAL;
        enableRemoteJPanel.add(jSeparator4, gridBagConstraints);

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.fill = java.awt.GridBagConstraints.BOTH;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.NORTH;
        gridBagConstraints.weightx = 1.0;
        gridBagConstraints.insets = new java.awt.Insets(5, 0, 0, 0);
        externalRemoteJPanel.add(enableRemoteJPanel, gridBagConstraints);

        jPanel1.setLayout(new java.awt.GridBagLayout());

        jPanel1.setMinimumSize(new java.awt.Dimension(300, 300));
        jPanel1.setPreferredSize(new java.awt.Dimension(600, 600));
        jButton1.setFont(new java.awt.Font("Dialog", 0, 12));
        jButton1.setText("Active Directory Users");
        jButton1.addMouseListener(new java.awt.event.MouseAdapter() {
            public void mouseClicked(java.awt.event.MouseEvent evt) {
                refreshAdUsers(evt);
            }
        });

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.gridy = 0;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.WEST;
        gridBagConstraints.insets = new java.awt.Insets(2, 2, 2, 2);
        jPanel1.add(jButton1, gridBagConstraints);

        jScrollPane1.setPreferredSize(new java.awt.Dimension(300, 200));
        jScrollPane1.setViewportView(jList1);

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 1;
        gridBagConstraints.gridy = 0;
        gridBagConstraints.gridwidth = java.awt.GridBagConstraints.REMAINDER;
        gridBagConstraints.gridheight = java.awt.GridBagConstraints.REMAINDER;
        gridBagConstraints.fill = java.awt.GridBagConstraints.BOTH;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.EAST;
        gridBagConstraints.insets = new java.awt.Insets(2, 2, 2, 2);
        jPanel1.add(jScrollPane1, gridBagConstraints);

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.gridy = 1;
        gridBagConstraints.fill = java.awt.GridBagConstraints.BOTH;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.SOUTH;
        externalRemoteJPanel.add(jPanel1, gridBagConstraints);

        jSeparator5.setForeground(new java.awt.Color(200, 200, 200));
        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.fill = java.awt.GridBagConstraints.HORIZONTAL;
        externalRemoteJPanel.add(jSeparator5, gridBagConstraints);

        jButton2.setFont(new java.awt.Font("Dialog", 0, 12));
        jButton2.setText("AD Lookup Script");
        jButton2.addMouseListener(new java.awt.event.MouseAdapter() {
            public void mouseClicked(java.awt.event.MouseEvent evt) {
                openAdPage(evt);
            }
        });

        jPanel2.add(jButton2);

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        externalRemoteJPanel.add(jPanel2, gridBagConstraints);

        gridBagConstraints = new java.awt.GridBagConstraints();
        gridBagConstraints.gridx = 0;
        gridBagConstraints.fill = java.awt.GridBagConstraints.HORIZONTAL;
        gridBagConstraints.anchor = java.awt.GridBagConstraints.NORTH;
        gridBagConstraints.weightx = 1.0;
        gridBagConstraints.weighty = 1.0;
        gridBagConstraints.insets = new java.awt.Insets(10, 10, 0, 10);
        add(externalRemoteJPanel, gridBagConstraints);

    }// </editor-fold>//GEN-END:initComponents

    private void openAdPage(java.awt.event.MouseEvent evt) {//GEN-FIRST:event_openAdPage
        try{
            String authNonce = Util.getRemoteAdminManager().generateAuthNonce();
            URL newURL = new URL( Util.getServerCodeBase(), "../adpb/?" + authNonce);
            ((BasicService) ServiceManager.lookup("javax.jnlp.BasicService")).showDocument(newURL);
        } catch(Exception f){
            Util.handleExceptionNoRestart("Error showing store wizard.", f);
        }
    }//GEN-LAST:event_openAdPage

    private void refreshAdUsers(java.awt.event.MouseEvent evt) {//GEN-FIRST:event_refreshAdUsers
        try {
            final java.util.List<UserEntry> allUserEntries = new Vector<UserEntry>();
            try{
                allUserEntries.addAll( Util.getAddressBook().getUserEntries(RepositoryType.MS_ACTIVE_DIRECTORY) );
            }
            catch(Exception f){
                Util.handleExceptionNoRestart("Error doing refresh", f);
                MOneButtonJDialog.factory(this, "Policy Manager", "There was a problem refreshing Active Directory users.  Please check your Active Directory settings and then try again.",
                                          "Policy Manager Warning", "Policy Manager Warning");
            }

            SwingUtilities.invokeLater( new Runnable(){ public void run(){
                updateUidModel(allUserEntries);
            }});
        } catch(Exception e){
            try{ Util.handleExceptionWithRestart("Error doing refresh", e); }
            catch(Exception f){
                Util.handleExceptionNoRestart("Error doing refresh", f);
                MOneButtonJDialog.factory(this, "Policy Manager", "There was a problem refreshing.  Please try again.",
                                          "Policy Manager Warning", "Policy Manager Warning");
            }
        }
    }//GEN-LAST:event_refreshAdUsers

    public void updateUidModel(java.util.List<UserEntry> userEntries){
        Vector<UserEntryWrapper> uidVector = new Vector<UserEntryWrapper>();

        UserEntryWrapper t = new UserEntryWrapper(null);
        uidVector.add(t);
        for( UserEntry userEntry : userEntries ){
            t = new UserEntryWrapper(userEntry);
            uidVector.add( t );
        }
        jList1.setListData(uidVector);
    }

    private void helpJButtonActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_helpJButtonActionPerformed
        try {
            URL newURL = new URL( "http://www.untangle.com/docs/get.php?"
                                  + "version=" + Version.getVersion()
                                  + "&source=active_directory_config");
            ((BasicService) ServiceManager.lookup("javax.jnlp.BasicService")).showDocument(newURL);
        } catch(Exception f){
            Util.handleExceptionNoRestart("Error showing help", f);
        }
    }//GEN-LAST:event_helpJButtonActionPerformed


    private void orgJTextFieldCaretUpdate(javax.swing.event.CaretEvent evt) {//GEN-FIRST:event_orgJTextFieldCaretUpdate
        if( !orgJTextField.getText().trim().equals( orgCurrent ) )
            ;
    }//GEN-LAST:event_orgJTextFieldCaretUpdate

    private class TestThread extends Thread {
        public TestThread(){
            setName("MVCLIENT-TestThread");
            setDaemon(true);
            start();
        }
        public void run(){
            if( ((MConfigJDialog)DirectoryRemoteADJPanel.this.getTopLevelAncestor()).getSettingsChanged() ){
                TestSaveSettingsJDialog dialog = new TestSaveSettingsJDialog((JDialog)DirectoryRemoteADJPanel.this.getTopLevelAncestor());
                if(!dialog.isProceeding())
                    return;

                if( !((MConfigJDialog)DirectoryRemoteADJPanel.this.getTopLevelAncestor()).saveSettings() )
                    return;
            }
            try{
                DirectoryADConnectivityTestJDialog testJDialog = new DirectoryADConnectivityTestJDialog((JDialog)DirectoryRemoteADJPanel.this.getTopLevelAncestor());
                testJDialog.setVisible(true);
            }
            catch(Exception e){
                try{ Util.handleExceptionWithRestart("Error running AD Test.", e); }
                catch(Exception f){ Util.handleExceptionNoRestart("Error running AD Test.", f); }
            }
        }
    }

    private void adTestJButtonActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_adTestJButtonActionPerformed
        if( Util.getIsDemo() )
            return;
        new TestThread();
    }//GEN-LAST:event_adTestJButtonActionPerformed

    private void adEnabledJRadioButtonActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_adEnabledJRadioButtonActionPerformed
        adEnabledDependency( true );
    }//GEN-LAST:event_adEnabledJRadioButtonActionPerformed

    private void adDisabledJRadioButtonActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_adDisabledJRadioButtonActionPerformed
        adEnabledDependency( false );
    }//GEN-LAST:event_adDisabledJRadioButtonActionPerformed

    private void portJSpinnerStateChanged(javax.swing.event.ChangeEvent evt) {//GEN-FIRST:event_portJSpinnerStateChanged
        ;
    }//GEN-LAST:event_portJSpinnerStateChanged

    private void hostJTextFieldCaretUpdate(javax.swing.event.CaretEvent evt) {//GEN-FIRST:event_hostJTextFieldCaretUpdate
        if( !hostJTextField.getText().trim().equals( hostCurrent ) )
            ;
    }//GEN-LAST:event_hostJTextFieldCaretUpdate

    private void loginJTextFieldCaretUpdate(javax.swing.event.CaretEvent evt) {//GEN-FIRST:event_loginJTextFieldCaretUpdate
        if( !loginJTextField.getText().trim().equals( loginCurrent ) )
            ;
    }//GEN-LAST:event_loginJTextFieldCaretUpdate

    private void passwordJPasswordFieldCaretUpdate(javax.swing.event.CaretEvent evt) {//GEN-FIRST:event_passwordJPasswordFieldCaretUpdate
        String password = new String(passwordJPasswordField.getPassword());
        if( !password.trim().equals(passwordCurrent) )
            ;
    }//GEN-LAST:event_passwordJPasswordFieldCaretUpdate

    private void baseJTextFieldCaretUpdate(javax.swing.event.CaretEvent evt) {//GEN-FIRST:event_baseJTextFieldCaretUpdate
        if( !baseJTextField.getText().trim().equals( domainCurrent ) )
            ;
    }//GEN-LAST:event_baseJTextFieldCaretUpdate

    private void adEnabledDependency(boolean enabled){
        hostJTextField.setEnabled( enabled );
        hostJLabel.setEnabled( enabled );
        portJSpinner.setEnabled( enabled );
        portJLabel.setEnabled( enabled );
        loginJTextField.setEnabled( enabled );
        loginJLabel.setEnabled( enabled );
        passwordJPasswordField.setEnabled( enabled );
        passwordJLabel.setEnabled( enabled );
        baseJTextField.setEnabled( enabled );
        baseJLabel.setEnabled( enabled );
        orgJTextField.setEnabled( enabled );
        orgJLabel.setEnabled( enabled );
        adTestJButton.setEnabled( enabled );
        jButton1.setEnabled(enabled);
        jList1.setEnabled(enabled);
    }

    // Variables declaration - do not modify//GEN-BEGIN:variables
    private javax.swing.ButtonGroup adButtonGroup;
    public javax.swing.JRadioButton adDisabledJRadioButton;
    public javax.swing.JRadioButton adEnabledJRadioButton;
    private javax.swing.JButton adTestJButton;
    private javax.swing.JLabel baseJLabel;
    public javax.swing.JTextField baseJTextField;
    private javax.swing.JPanel enableRemoteJPanel;
    private javax.swing.JPanel externalRemoteJPanel;
    private javax.swing.JButton helpJButton;
    private javax.swing.JLabel hostJLabel;
    public javax.swing.JTextField hostJTextField;
    private javax.swing.JButton jButton1;
    private javax.swing.JButton jButton2;
    private javax.swing.JList jList1;
    private javax.swing.JPanel jPanel1;
    private javax.swing.JPanel jPanel2;
    private javax.swing.JScrollPane jScrollPane1;
    private javax.swing.JSeparator jSeparator2;
    private javax.swing.JSeparator jSeparator3;
    private javax.swing.JSeparator jSeparator4;
    private javax.swing.JSeparator jSeparator5;
    private javax.swing.JLabel loginJLabel;
    public javax.swing.JTextField loginJTextField;
    private javax.swing.JLabel orgJLabel;
    public javax.swing.JTextField orgJTextField;
    private javax.swing.JLabel passwordJLabel;
    private javax.swing.JPasswordField passwordJPasswordField;
    private javax.swing.JLabel portJLabel;
    private javax.swing.JSpinner portJSpinner;
    private javax.swing.JPanel restrictIPJPanel;
    private javax.swing.JPanel restrictIPJPanel1;
    private javax.swing.ButtonGroup serverButtonGroup;
    private javax.swing.JLabel serverJLabel1;
    private javax.swing.JLabel testJLabel;
    // End of variables declaration//GEN-END:variables


}
