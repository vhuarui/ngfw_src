Ext.namespace('Ung');
Ext.namespace('Ung.SetupWizard');

// The location of the blank pixel image
Ext.BLANK_IMAGE_URL = 'ext/resources/images/default/s.gif';
// the main internationalization object
var i18n=null;
// the main json rpc object
var rpc = {};

Ung.SetupWizard.LabelWidth = 200;
Ung.SetupWizard.LabelWidth2 = 214;
Ung.SetupWizard.LabelWidth3 = 70;
Ung.SetupWizard.LabelWidth4 = 100;
Ext.apply(Ext.form.VTypes, {
	ipCheck:function(val,field){
		var re = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/;
		if(val.match(re)){
			return true;
		}
	},
	emailAddressCheck:function(val,field){
		var re = /[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
		if(val.match(re)){
			return true;
		}
	},
	emailAddressMatchCheck:function(val,field){
		var email_original = Ext.getCmp(field.compareEmailField);
		return val == email_original.getValue();
	},
	passwordConfirmCheck:function(val,field){
		var pass_original = Ext.getCmp(field.comparePasswordField);
		return val == pass_original.getValue();
	},
	ipCheckText :'Please enter a valid IP Address',
	emailAddressCheckText:'Please enter a valid email address',
	emailAddressMatchCheckText:'Email addresses do not match',
	passwordConfirmCheckText:'Passwords do not match'
});
Ung.SetupWizard.Welcome = Ext.extend(Object,
{
    constructor : function( config )
    {
        var panel = new Ext.FormPanel({
            items : [
				{
					xtype:'label',
					html : '<h2 class="wizardTitle">'+i18n._( "Thanks for using Untangle" )+'</h2>',
				
				},
				{
                xtype : 'label',
				cls:'noborder',
                html : i18n._( 'This wizard will guide you through the inital setup and configuration of your Untangle Server. <br/><br/>Click <b>Next</b> to get started.' )
                    }],
				
                });
        
        this.card = {
            title : i18n._( "Welcome" ),
            //cardTitle : i18n._( "Thanks for using Untangle" ),
            panel : panel
        };
    }
});

Ung.SetupWizard.Settings = Ext.extend(Object, {
    constructor : function( config )
    {
	this.panel = new Ext.FormPanel({
            defaultType : 'fieldset',
            defaults : { 
                autoHeight : true,
				cls:'noborder'
            },
            items : [
				{
					xtype:'label',
					html : '<h2 class="wizardTitle">'+i18n._( "Configure your Server" )+'</h2>',
				
				},
				{
                defaultType : 'textfield',
				defaults:{
					msgTarget:'side',
					validationEvent:'blur'
				},
                items : [				
				{				
                    xtype : 'label',
                    html : i18n._( '<b>Choose a password for the admin account</b>' ),
                    border : false
                },
				{
                    inputType : 'text',
                    fieldLabel : i18n._('Login'),
                    name : 'login',
					value:'admin',
					readOnly:true,
					fieldClass:'noborder',
					ctCls:'smallTopMargin'
                },
				{
                    inputType : 'password',
                    fieldLabel : i18n._('Password'),
                    name : 'password',
					id:'settings_password',
					allowBlank:false,
                    minLength : 3,
                    minLengthText : i18n.sprintf(i18n._("The password is shorter than the minimum %d characters."), 3)
                },{
                    inputType : 'password',
                    fieldLabel : i18n._('Confirm Password'),
                    name : 'confirmPassword',
					allowBlank:false,
					comparePasswordField:'settings_password',
					vtype:'passwordConfirmCheck'
                }]
            },{
                items : [
				{				
                    xtype : 'label',
                    html : i18n._( '<b>Select a timezone</b>' ),
                    border : false
                },
				{
                    xtype : 'combo',
                    name : 'timezone',
                    editable : false,
                    store : Ung.SetupWizard.TimeZoneStore,
                    width : 350,
                    listWidth : 355,
                    hideLabel : true,
                    mode : 'local',
                    value : Ung.SetupWizard.CurrentValues.timezone,
                    triggerAction : 'all',
                    listClass : 'x-combo-list-small',
					ctCls:'smallTopMargin'
                }]
            }]
        });

        this.card = {
            title : i18n._( "Settings" ),
            //cardTitle : i18n._( "Configure your Server" ),
            panel : this.panel,
            onNext : this.saveSettings.createDelegate( this ),
			onValidate : this.validateSettings.createDelegate(this)
        };
    },
	validateSettings : function(){
		var rv = _validate(this.panel.items.items);
		return rv;
	},
    saveSettings : function( handler )
    {
        var saver = new Ung.SetupWizard.SettingsSaver( this.panel, handler );
        saver.savePassword();
    }
});

Ung.SetupWizard.SettingsSaver = Ext.extend( Object, {
    constructor : function( panel, handler )
    {
        this.panel = panel;
        this.handler = handler;
    },

    savePassword : function()
    {
        /* First clear all of the user passwords */
        var users = Ung.SetupWizard.CurrentValues.users.users.set;

        /* New Password */
        var password = this.panel.find( "name", "password" )[0].getValue();
        
        for ( key in users ) {
            var user = users[key];
            user.password = "";
            if ( user.login == "admin" ) user.clearPassword = password;
        }

        rpc.adminManager.setAdminSettings( this.saveTimeZone.createDelegate( this ), Ung.SetupWizard.CurrentValues.users );
    },

    saveTimeZone : function( result, exception )
    {
        if( exception ) {
            Ext.MessageBox.alert(i18n._( "Unable to save the admin password" ),exception.message); 
            return;
        }
        
        var timezone = this.panel.find( "name", "timezone" )[0].getValue();
        
        rpc.adminManager.setTimeZone( this.complete.createDelegate( this ), timezone );
    },

    /* This is no longer used */
    saveHostname : function( result, exception )
    {
        if( exception ) {
            Ext.MessageBox.alert(i18n._( "Unable to save the time zone" ),exception.message); 
            return;
        }
        
        var addressSettings = Ung.SetupWizard.CurrentValues.addressSettings;
        
        addressSettings.hostName = this.panel.find( "name", "hostname" )[0].getValue();
        
        rpc.networkManager.setAddressSettings( this.saveAutoUpgrade.createDelegate( this ), 
                                               addressSettings );
    },

    /* This is no longer used */
    saveAutoUpgrade : function( result, exception )
    {
        if( exception ) {
            Ext.MessageBox.alert(i18n._( "Unable to save the hostname" ),exception.message); 
            return;
        }

        var upgradeSettings = Ung.SetupWizard.CurrentValues.upgradeSettings;
        upgradeSettings.autoUpgrade = this.panel.find( "name", "autoUpgrade" )[0].getValue();

        rpc.toolboxManager.setUpgradeSettings( this.complete.createDelegate( this ), upgradeSettings );
    },

    complete : function( result, exception )
    {
        if ( exception ) {
            Ext.MessageBox.alert("Unable to save Upgrade Settings",exception.message); 
            return;
        }

        this.handler();
    }
});


Ung.SetupWizard.Registration = Ext.extend( Object, {
    constructor : function( config )
    {
        this.employeeStore =  [
                              [ 5, i18n._( "1-5" )],
                              [ 10, i18n._( "5-10" )],
                              [ 50, i18n._( "10-50" )],
                              [ 100, i18n._( "50-100" )],
                              [ 250, i18n._( "100-250" )],
                              [ 500, i18n._( "250-500" )],
                              [ 1000, i18n._( "500-1000" )],
                              [ 2500, i18n._( "> 1000 " )]];


        this.findUntangleStore = [
            i18n._( "Google / search engine" ),
            i18n._( "Online Review" ),
            i18n._( "Blog" ),
            i18n._( "Friend" ),
            i18n._( "Contacted by sales person" ),
            i18n._( "My IT consultant or VAR" ),
            i18n._( "Trade Show" ),
            i18n._( "Other (for example, an online forum or software directory)" ) ];

        this.industryStore = [
            i18n._( "Accounting" ),
            i18n._( "Aerospace/Defense" ),
            i18n._( "Auto" ),
            i18n._( "Biotechnology" ),
            i18n._( "Broadcasting" ),
            i18n._( "Business Services" ),
            i18n._( "Construction" ),
            i18n._( "Consumer Goods" ),
            i18n._( "Consumer Services" ),
            i18n._( "Education" ),
            i18n._( "Entertainment" ),
            i18n._( "Financial Services" ),
            i18n._( "Government / Public Sector" ),
            i18n._( "Healthcare" ),
            i18n._( "High Technology / IT / Software" ),
            i18n._( "Home / Personal Use" ),
            i18n._( "Hospitality / Food Services" ),
            i18n._( "Industrial / Manufacturing" ),
            i18n._( "Legal" ),
            i18n._( "Life Sciences" ),
            i18n._( "Marketing Services" ),
            i18n._( "Oil & Gas" ),
            i18n._( "Processed & Packaged Goods" ),
            i18n._( "Professional Services" ),
            i18n._( "Publishing" ),
            i18n._( "Telecommunications" ),
            i18n._( "Utilities" ),
            i18n._( "Other" ) ];
        
        this.form = new Ext.FormPanel({
            defaultType : 'fieldset',
            defaults : { 
                autoHeight : true,
				cls:'noborder'
				
            },
            items : [{
					xtype:'label',
					html : '<h2 class="wizardTitle">'+i18n._( "Registration" )+'</h2>',
				
				},{
                defaultType : 'textfield',
				defaults:{
					validationEvent:'blur',
					msgTarget:'side'
				},
                items : [
				{
					xtype:'label',
					html : i18n._( '<span class="requiredstar">*</span> indicates Required Information' ),
					border:false,
					cls:'requiredInfo'
				},
				{
                    xtype : 'label',
                    html : '<b>'+i18n._( 'Please provide administrator contact info.' )+'</b>',
                    border : false
                },{
                    fieldLabel : '<span class="requiredstar">*</span>'+i18n._('Email'),
                    name : 'email',
					id:'registration_email',
                    width: 200,
					allowBlank:false,					
					ctCls:'smallTopMargin',
					vtype:'emailAddressCheck',					
					
                },{
                    fieldLabel : '<span class="requiredstar">*</span>'+i18n._('Confirm Email'),
                    name : 'confirmEmail',
					allowBlank:false,										
					compareEmailField:'registration_email',
					vtype:'emailAddressMatchCheck',
                    width: 200
                },{
                    fieldLabel : '<span class="requiredstar">*</span>'+i18n._('Company Name'),
                    name : 'companyName',
					allowBlank:false,
					blankText:i18n._('Company name is required')										
                },{
                    fieldLabel : '<span class="requiredstar">*</span>'+i18n._('Name'),
                    name : 'name',
					allowBlank:false,
					blankText:i18n._('Name is required')					
                },{
                    xtype : 'numberfield',
                    minValue : 0,
                    allowDecimals : false,
                    fieldLabel : '<span class="requiredstar">*</span>'+i18n._('Number of personal computers behind Untangle Server'),
                    name : 'numSeats',
					allowBlank:false	
                }]
            },{
                defaultType : 'textfield',
                items : [{
                    xtype : 'label',
                    html : '<b>'+i18n._( 'Answering these questions will help us build a better product - for you!' )+'</b>',
                    border : false
                },{
                    fieldLabel : i18n._('How did you find Untangle'),
                    name : "findUntangle",
                    xtype : 'combo',
                    width : 200,
                    listWidth : 205,
                    store : this.findUntangleStore,
                    mode : 'local',
                    triggerAction : 'all',
                    listClass : 'x-combo-list-small',
					ctCls:'smallTopMargin'					
                },{
                    fieldLabel : i18n._('State/Province'),
                    name : "state"
                },{
                    fieldLabel : i18n._('Country'),
                    name : "country"
                },{
                    xtype : 'combo',
                    width : 200,
                    listWidth : 205,
                    store : this.industryStore,
                    mode : 'local',
                    triggerAction : 'all',
                    listClass : 'x-combo-list-small',
                    fieldLabel : i18n._('What industry is your company in'),
                    name : "industry"
                },{
                    xtype : 'combo',
                    width : 70,
                    listWidth: 75,
                    mode : 'local',
                    triggerAction : 'all',
                    store : this.employeeStore,
                    listClass : 'x-combo-list-small',
                    fieldLabel : i18n._('Number of employees'),
                    name : "numEmployees"
                }]
            }]
        });

        this.card = {
            title : i18n._( "Registration" ),
            cardTitle : i18n._( "Registration" ),
            panel : this.form,
            onNext : this.saveRegistrationInfo.createDelegate( this ),
			onValidate: this.validateRegistration.createDelegate(this)
        };
    },
	validateRegistration : function(){
		var rv = _validate(this.card.panel.items.items);
		return rv;
	},
    saveRegistrationInfo : function( handler )
    {
        var info = Ung.SetupWizard.CurrentValues.registrationInfo;
        var misc = {};
        this.setRegistrationValue( "name", misc, true );
        this.setRegistrationValue( "email", info, true, "emailAddr" );
        this.setRegistrationValue( "companyName", info, true );
        this.setRegistrationValue( "numSeats", info, true );

        this.setRegistrationValue( "findUntangle", misc, false );
        this.setRegistrationValue( "state", misc, false );
        this.setRegistrationValue( "country", misc, false );
        this.setRegistrationValue( "industry", misc, false );
        this.setRegistrationValue( "numEmployees", misc, false );

        info.misc.map = misc;

        rpc.adminManager.setRegistrationInfo(this.errorHandler.createDelegate( this, [ handler ], true ), info );
    },

    errorHandler : function( result, exception, foo, handler )
    {
        if(exception) {
            Ext.MessageBox.alert("Failed",exception.message); 
            return;
        }
        
        handler();
    },

    setRegistrationValue : function( fieldName, map, isRequired, param )
    {
        if ( param == null ) param = fieldName;

        var field = this.form.find( "name", fieldName );
        if ( field == null || field.length == 0 ) return;
        field = field[0];
        var value = null;

        /* Combo has to use the raw value, otherwise editable doesn't come through */
        if ( field.xtype == "combo" ) value = field.getRawValue();
        else value = field.getValue();

        if ( value.length == 0 ) return;
        map[param] = "" + value;
    }
});

Ung.SetupWizard.Interfaces = Ext.extend( Object, {
    constructor : function()
    {
        var data = this.fixInterfaceList( Ung.SetupWizard.CurrentValues.interfaceArray );
    
        this.interfaceStore = new Ext.data.Store({
            reader : new Ext.data.ArrayReader({},[{ name : "name" }, { name : "status" }]),
            data : data
        });
    
        var refreshButton = new Ext.Button( {
            text : i18n._( "Refresh" ),
            handler : this.refreshInterfaces,
            scope : this
        });
    
        this.interfaceGrid = new Ext.grid.GridPanel({
            store : this.interfaceStore,
            loadMask : true,
            stripeRows : true,
			baseCls:'smallTopMargin',
            enableColumnResize : false,
            autoResizeColumn : 2,
            disableSelection : false,
            selModel: new Ext.grid.RowSelectionModel({singleSelect:true}),
            enableDragDrop : true,
            ddGroup: 'interfaceDND',
            ddText : '',
            height : 300,
            tbar : [ refreshButton ],
            cm : new Ext.grid.ColumnModel([
            {
               header: i18n._( "Name" ),
               dataIndex: 'name',
               sortable : false,
               fixed : true,
               width: 100
            },{
               header: i18n._( "Status" ),
               dataIndex: 'status',
               sortable : false,
               renderer : function( value ) {
                   return value[0] + ": " + value[1];
               },
               width : 400
            }]),
        });
    
        var panel = new Ext.Panel({
			defaults:{cls:'noborder'},
            items : [
				{
					html:'<h2 class="wizardTitle">'+i18n._('Identify Network Cards')+'<h2>',
					border: false
				},
				{
				xtype:'label',
                html : i18n._( 'This step can help you identify your external, internal, and other network cards. Plug an active cable into each network card one at a time and hit refresh to determine which network card is which. You can also drag and drop the interfaces to remap them at this time.' ),
                border : false
            }, this.interfaceGrid ]
        });
        
        this.isDragAndDropInitialized = false;
    
        this.card = {
            title : i18n._( "Network Cards" ),
            panel : panel,
            onLoad : function( complete ) {
                if ( this.isDragAndDropInitialized == false ) {
                    this.initializeDragAndDrop();
                }
                this.isDragAndDropInitialized = true;

                complete();
            }.createDelegate( this ),
                        
            onNext : this.saveInterfaceList.createDelegate( this )
        };
    },
    
    initializeDragAndDrop : function()
    {
        var ddrow = new Ext.dd.DropTarget(this.interfaceGrid.getView().mainBody, {
            ddGroup : 'interfaceDND',                
            copy:false,
            notifyDrop : this.onNotifyDrop.createDelegate( this )
        });
    },
    
    onNotifyDrop : function(dd, e, data)
    {
        var sm = this.interfaceGrid.getSelectionModel();
        var rows=sm.getSelections();
        var cindex=dd.getDragData(e).rowIndex;
        
        if ( typeof cindex == "undefined" ) return false;
        if ( rows.length != 1 ) return false;
        
        var row = this.interfaceStore.getById(rows[0].id);
        var status = row.get( "status" );
    
        var c = 0;
        var data = [];
        var index = -1;
        
        this.interfaceStore.each( function( currentRow ) {
            if ( currentRow == row ) index = c;
            data.push( currentRow.get( "status" ));
            c++;
        });
    
        if ( index == cindex ) return true;
        
        data.splice( index, 1 );
        data.splice( cindex, 0, status );
    
        this.interfaceStore.each( function( currentRow ) {
            currentRow.set( "status", data.shift());
        });
    
        sm.clearSelections();
    
        return true;
    },

    /* Given a list of interfaces, this takes out the ones that are not used */
    fixInterfaceList : function( interfaceArray )
    {
        var cleanArray = [];

        var data = interfaceArray.list;

        for ( var c = 0 ;  c < data.length ; c++ ) {
            var i = data[c];
            /* This is the VPN interfaces, and this is a magic number. */
            if ( i.argonIntf == 7 ) continue;
            
            /* This is an interface that doesn't exist */
            // if ( i.systemName.indexOf( 'nointerface' ) == 0 ) continue;

            cleanArray.push( i );
        }

        /* Now create a new array, in order to handle reordering, it is better
         * to just have two few fields */
        interfaceList = [];
        
        for ( var c = 0 ; c < cleanArray.length ; c++ ) {
            var i = cleanArray[c];
            interfaceList.push( [ i18n._( i.name ), [ i.systemName, i.connectionState, i.currentMedia ]] );
        }

        return interfaceList;
    },

    saveInterfaceList : function( handler )
    {
        /* Commit the store to get rid of the change marks */
        this.interfaceStore.commitChanges();

        /* Build the two interface arrays */
        var osArray = [];
        var userArray = [];
        this.interfaceStore.each( function( currentRow ) {
            var status = currentRow.get( "status" );
            userArray.push( currentRow.get( "name" ));
            osArray.push( status[0] );
        });

        rpc.networkManager.remapInterfaces( this.errorHandler.createDelegate( this, [ handler ], true ), osArray, userArray );
    },
    
    errorHandler : function( result, exception, foo, handler )
    {
        if(exception) {
            Ext.MessageBox.alert(i18n._( "Unable to remap the interfaces." ), exception.message ); 
            return;
        }

        handler();
    },

    refreshInterfaces : function()
    {
        rpc.networkManager.getInterfaceList( this.completeRefreshInterfaces.createDelegate( this ), true );
    },
        
    completeRefreshInterfaces : function( result, exception )
    {
        if ( exception ) {
            Ext.MessageBox.alert( i18n._( "Unable to refresh the interfaces." ), exception.message );
            return;
        }
        
        var interfaceList = this.fixInterfaceList( result );
        
        if ( interfaceList.length != this.interfaceStore.getCount()) {
            Ext.MessageBox.alert( i18n._( "New interfaces" ), i18n._ ( "There are new interfaces, please restart the wizard." ), exception.message );
            return;            
        }
        
        var statusHash = {};
        /* XXX This status array is brittle and should be refactored. XXXX */
        for ( var c = 0 ;c < interfaceList.length ; c++ ) {
            var status = interfaceList[c][1];
            statusHash[status[0]] = status;
        }
        
        /* This is designed to handle the case where the interfaces have been remapped. */
        this.interfaceStore.each( function( currentRow ) {
            var status = currentRow.get( "status" );
            currentRow.set( "status", statusHash[status[0]]);
        });
    }
});

Ung.SetupWizard.Internet = Ext.extend( Object, {
    constructor : function( config )
    {
        this.configTypes = 
        [[ "dhcp", i18n._( "Dynamic (DHCP)" ) ],
         [ "static", i18n._( "Static" ) ],
         [ "pppoe", i18n._( "PPPoE" ) ]];
         
        this.cards = [];

        this.cards.push( this.dhcpPanel = new Ext.FormPanel({
            saveData : this.saveDHCP.createDelegate( this ),
            border : false,
			cls:'networkCardFormMargin',
            labelWidth : Ung.SetupWizard.LabelWidth,
            defaultType : 'textfield',			
            items : [{
                xtype : 'fieldset',
                title : i18n._( "DHCP Settings" ),
                defaultType : 'textfield',
                defaults : {
					readOnly:true,
					fieldClass:'noborder',
                },
                autoHeight : true,
                items : [
				{
                    name : "ip",
                    fieldLabel : i18n._( "IP" )
                },{
                    name : "netmask",
                    fieldLabel : i18n._( "Netmask" )
                },{
                    name : "gateway",
                    fieldLabel : i18n._( "Gateway" )
                },{
                    name : "dns1",
                    fieldLabel : i18n._( "Primary DNS" )
                },{
                    name : "dns2",
                    fieldLabel : i18n._( "Secondary DNS" )
                },{
	                xtype : 'button',
	                text : i18n._( 'Refresh' ),
	                handler : this.refresh.createDelegate( this ),
	                disabled : false,
					cls:'rightAlign'					
				},{
                xtype : 'button',
                text : i18n._( 'Test Connectivity' ),
				cls:'testConnectivity',
                handler : this.testConnectivity.createDelegate( this ),
                disabled : false
            }]
             }]}));
                

        this.cards.push( this.staticPanel = new Ext.FormPanel({
            saveData : this.saveStatic.createDelegate( this ),
            border : false,
			cls:'networkCardFormMargin',			
            labelWidth : Ung.SetupWizard.LabelWidth,
            defaultType : 'textfield',
            items : [{
                xtype : 'fieldset',
                title : i18n._( "Static Settings" ),
                defaultType : 'textfield',
                defaults : {
                    disabled : false,
					msgTarget:'side',
					maskRe:/(\d+|\.)/,
					vtype:'ipCheck',					
                },
                autoHeight : true,
				items:[
					{
		                name : "ip",
		                fieldLabel : i18n._( "IP" ),
						allowBlank:false							
		            },{
		                name : "netmask",
		                fieldLabel : i18n._( "Netmask" ),
						vText:i18n._('Invalid Netmask Value'),
						allowBlank:false													
		            },{
		                name : "gateway",
		                fieldLabel : i18n._( "Gateway" ),
						allowBlank:false													
		            },{
		                name : "dns1",
		                fieldLabel : i18n._( "Primary DNS" ),
						allowBlank:false													
		            },{
		                name : "dns2",
		                fieldLabel : i18n._( "Secondary DNS" ),
						allowBlank:false													
		            },{
                xtype : 'button',
                text : i18n._( 'Test Connectivity' ),
				cls:'testConnectivity2',
                handler : this.testConnectivity.createDelegate( this ),
                disabled : false
            }
				]				
			}]}));

        /* PPPoE Panel */
        this.cards.push( this.pppoePanel = new Ext.FormPanel({
            saveData : this.savePPPoE.createDelegate( this ),
            border : false,
			cls:'networkCardFormMargin',						
            labelWidth : Ung.SetupWizard.LabelWidth2,
            defaultType : 'textfield',
            items : [{
                xtype : 'fieldset',
                title : i18n._( "PPPoE Settings" ),
                defaultType : 'textfield',
                defaults : {
					readOnly:true
				},
                autoHeight : true,
                items : [{
	                fieldLabel : i18n._( "Username" ),
	                name : "username",
	                disabled : false,
					readOnly:false,
					fieldClass:'',
					labelStyle:'width:'+Ung.SetupWizard.LabelWidth+'px'					
	            },{
	                name : "password",
	                inputType : 'password',
	                fieldLabel : i18n._( "Password" ),
	                disabled : false,
					readOnly:false,
					fieldClass:'',
					labelStyle:'width:'+Ung.SetupWizard.LabelWidth+'px'					
	            },
				{
                    fieldLabel : i18n._( "IP" ),
					labelStyle:'width:'+Ung.SetupWizard.LabelWidth+'px',
                    name : "ip",
					fieldClass:'noborder'					
                },{
                    fieldLabel : i18n._( "Netmask" ),
                    name : "netmask",
					labelStyle:'width:'+Ung.SetupWizard.LabelWidth+'px',
					fieldClass:'noborder'					
                },{
                    name : "gateway",
                    fieldLabel : i18n._( "Gateway" ),
					labelStyle:'width:'+Ung.SetupWizard.LabelWidth+'px',
					fieldClass:'noborder'					
                },{
                    name : "dns1",
                    fieldLabel : i18n._( "Primary DNS" ),
					labelStyle:'width:'+Ung.SetupWizard.LabelWidth+'px',
					fieldClass:'noborder'					
                },{
                    name : "dns2",
                    fieldLabel : i18n._( "Secondary DNS" ),
					labelStyle:'width:'+Ung.SetupWizard.LabelWidth+'px',
					fieldClass:'noborder'					
                },
				{
                xtype : 'button',
                text : i18n._( 'Refresh' ),
                handler : this.refresh.createDelegate( this ),
                disabled : false,
				cls:'rightAlign'
				},{
                xtype : 'button',
                text : i18n._( 'Test Connectivity' ),
				cls:'testConnectivity',				
                handler : this.testConnectivity.createDelegate( this ),
                disabled : false
            }				
				]
             }]}));
    
        this.cardPanel = new Ext.Panel({
            cls : 'untangle-form-panel',
            border : false,
            layout : 'card',
            items : this.cards,
            autoHeight : true,
            activePanel : 0,
            defaults : { 
                autoHeight : true,
                border : false,
            }
        });

        var configure = new Ext.FormPanel({
            cls : 'untangle-form-panel',
            border : false,
            autoHeight : true,
            labelWidth : Ung.SetupWizard.LabelWidth2,
            items : [
				{
					html:'<h2 class="wizardTitle">'+i18n._('Configure your Internet Connection')+'<h2>',
					border: false
				},
				{
                xtype : 'combo',
                fieldLabel : i18n._('Configuration Type'),
                name : 'configType',
                editable : false,
                store : this.configTypes,
				labelWidth:Ung.SetupWizard.LabelWidth2,
                mode : 'local',
                listeners : {
                    "select" : {
                        fn : this.onSelectConfig,
                        scope : this
                    }
                },
                width : 100,
                listWidth : 105,
                value : this.configTypes[0][0],
                triggerAction : 'all',
                listClass : 'x-combo-list-small'
            }]
        });

        var panel = new Ext.Panel({
            cls : null,
            defaults : {
                cls : null
            },
            items : [ configure, this.cardPanel]
        });
        
        this.isInitialized = false;
        
        this.card = {
            title : i18n._( "Internet Connection" ),
            panel : panel,
            onLoad : function( complete )
            {
                if ( !this.isInitialized ) this.cardPanel.layout.setActiveItem( 0 );
                
                this.isInitialized = true;
                complete();
            }.createDelegate(this),
            onNext : this.saveSettings.createDelegate( this ),
			onValidate : this.validateInternetConnection.createDelegate(this)			
        }
    },
    validateInternetConnection:function(){
		var _config = this.card.panel.find("name","configType")[0];
		var rv = _validate(this[_config.getValue()+'Panel'].items.items);
		return rv;		
	},
    onSelectConfig : function( combo, record, index )
    {
        this.cardPanel.layout.setActiveItem( index );
    },

    saveSettings : function( handler )
    {
        this.cardPanel.layout.activeItem.saveData( handler );
    },

    saveDHCP : function( handler )
    {
        var ns = Ung.SetupWizard.CurrentValues.networkSettings;
        ns.dhcpEnabled = true;
        ns.PPPoESettings.live = false;
        /* There is really no need to save the address settings again. */
        rpc.networkManager.setSetupSettings( this.complete.createDelegate( this, [ handler ], true ), ns );
    },
    
    saveStatic : function( handler )
    {
        var ns = Ung.SetupWizard.CurrentValues.networkSettings;
        ns.dhcpEnabled = false;
        ns.PPPoESettings.live = false;

        ns.host = this.staticPanel.find( "name", "ip" )[0].getValue();
        ns.netmask = this.staticPanel.find( "name", "netmask" )[0].getValue();
        ns.gateway = this.staticPanel.find( "name", "gateway" )[0].getValue();
        ns.dns1 = this.staticPanel.find( "name", "dns1" )[0].getValue();
        var dns2 = this.staticPanel.find( "name", "dns2" )[0].getValue();
        
        if ( dns2.length > 0 ) ns.dns2 = dns2;
        else ns.dns2 = null;

        rpc.networkManager.setSetupSettings( this.complete.createDelegate( this, [ handler ], true ), ns );
    },

    savePPPoE : function( handler )
    {
        var ns = Ung.SetupWizard.CurrentValues.networkSettings;
        ns.dhcpEnabled = true;
        ns.PPPoESettings.live = true;

        ns.PPPoESettings.username = this.pppoePanel.find( "name", "username" )[0].getValue();
        ns.PPPoESettings.password = this.pppoePanel.find( "name", "password" )[0].getValue();
        
        rpc.networkManager.setSetupSettings( this.complete.createDelegate( this, [ handler ], true ), ns );
    },

    complete : function( result, exception, foo, handler )
    {
        if(exception) {
            Ext.MessageBox.alert( i18n._( "Network Settings" ),exception.message); 
            return;
        }

        Ung.SetupWizard.CurrentValues.networkSettings = result;

        this.refreshNetworkSettings();
        
        handler();
    },

    /* Refresh the current network settings (lease or whatever) */
    refresh : function()
    {
        Ext.MessageBox.wait(i18n._("Refreshing..."), i18n._("Please wait"));
        
        var handler = function() { 
            Ext.MessageBox.hide();
        };

        this.cardPanel.layout.activeItem.saveData( handler );
    },

    testConnectivity : function()
    {
        Ext.MessageBox.wait(i18n._("Testing Connectivity..."), i18n._("Please wait"));
        
        var handler = this.execConnectivityTest.createDelegate( this );

        this.cardPanel.layout.activeItem.saveData( handler );        
    },
    
    execConnectivityTest : function()
    {
        rpc.connectivityTester.getStatus( this.completeConnectivityTest.createDelegate( this ));
    },
    
    completeConnectivityTest : function( result, exception )
    {
        if ( exception ) {
            Ext.MessageBox.alert( i18n._( "Network Settings" ),exception.message); 
            return;
        }

        var message = "";

        if (( result.tcpWorking == false )  && ( result.dnsWorking == false )) {
            message = i18n._( "Warning! Internet and DNS failed." );
        } else if ( result.tcpWorking == false ) {
            message = i18n._( "Warning! DNS succeeded, but Internet failed." );
        } else if ( result.dnsWorking == false ) {
            message = i18n._( "Warning! Internet succeeded, but DNS failed." );
        } else {
            message = i18n._( "Success!" );
        }

        Ext.MessageBox.alert( i18n._( "Internet Status" ), message ); 
    },

    /* This doesn't reload the settings, it just updates what is
     * displayed inside of the User Interface. */
    refreshNetworkSettings : function()
    {
        var settings = Ung.SetupWizard.CurrentValues.networkSettings;
        for ( var c = 0; c < this.cards.length ; c++ ) {
            var card = this.cards[c];
            this.updateValue( card.find( "name", "ip" )[0], settings.host );
            this.updateValue( card.find( "name", "netmask" )[0], settings.netmask );
            this.updateValue( card.find( "name", "gateway" )[0], settings.gateway );
            this.updateValue( card.find( "name", "dns1" )[0], settings.dns1 );
            this.updateValue( card.find( "name", "dns2" )[0], settings.dns2 );
        }
    },

    /* Guard the field to shield strange values from the user. */
    updateValue : function( field, value )
    {
        if ( field == null ) return;
        if ( value == null || value == "0.0.0.0" ) value = "";

        field.setValue( value );
    }
    
});

Ung.SetupWizard.InternalNetwork = Ext.extend( Object, {
    constructor : function( config )
    {
        this.panel = new Ext.FormPanel({
            defaultType : 'fieldset',
            defaults : {
                autoHeight : true,
				labelWidth : Ung.SetupWizard.LabelWidth3,			
            },
            items : [
			{
					xtype:'label',
					html : '<h2 class="wizardTitle">'+i18n._( "Configure your Internal Network Interface" )+'</h2>',
				
			},			
			{
                //title : i18n._( 'Transparent Bridge' ),
				cls:'noborder',
                items : [{
                    xtype : 'radio',
                    name : 'bridgeInterfaces',
                    inputValue : 'bridge',
					boxLabel:i18n._('Transparent Bridge'),
					ctCls:'largeOption',					
                    //boxLabel : i18n._( 'This is recommended if the external interface is connected to a router or firewall.' ),
                    hideLabel : 'true'
                },{
					xtype:'label',
					html:'<div class="wizardlabelmargin1">'+i18n._('This is recommended if the external port is plugged into a firewall/router. This bridges Internal and External and disables DHCP.')+'</div>'
				},
				
				{
                    xtype : 'label',
                    html : '<img class="wizardlabelmargin2" src="/skins/' + Ung.SetupWizard.currentSkin + '/images/admin/wizard/bridge.png"/>'
                }]
            },{
				cls:'noborder tallMargin',	

                items : [{
                    xtype : 'radio',
                    name : 'bridgeInterfaces',
                    inputValue : 'router',
                    boxLabel : i18n._( 'Router' ),
					ctCls:'largeOption',					
                    hideLabel : 'true',
					listeners : {
                        check : {
                            fn : function( checkbox, checked ) {
                                this.onSetRouter(checked);
                            },
                            scope : this
                        }
                    }					
                },
				{
					xtype:'label',
					html:'<div class="wizardlabelmargin1">'+i18n._('This is recommended if the external port is plugged into your internet  connection. This enables NAT on the Internal Interface and DHCP.')+'</div>'
				},{
                    xtype : 'label',
                    html : '<img class="wizardlabelmargin3" src="/skins/' + Ung.SetupWizard.currentSkin + '/images/admin/wizard/router.png"/>'
                },				
				{
                    name : 'network',
                    xtype : 'textfield',
                    fieldLabel : i18n._('Network'),
					vText:i18n._('Please enter a valid Network  Address'),
					vtype:'ipCheck',
					allowBlank:false,
					msgTarget:'side',
					maskRe:/(\d+|\.)/					
                },{
                    name : 'netmask',
                    xtype : 'textfield',
                    fieldLabel : i18n._('Netmask'),
					vText:i18n._('Please enter a valid Netmask Value'),
					vtype:'ipCheck',
					allowBlank:false,
					msgTarget:'side',
					maskRe:/(\d+|\.)/					
                }]
           }]
        });
        
        this.card = {
            title : i18n._( "Internal Network" ),
            panel : this.panel,
            onNext : this.saveInternalNetwork.createDelegate( this ),
			onValidate:this.validateInternalNetwork.createDelegate(this)
        }
    },
	onSetRouter:function(isSet){
		var ar = [this.panel.find('name','network')[0],this.panel.find('name','netmask')[0]];
		for(var i=0;i<ar.length;i++){
			ar[i].setDisabled(!isSet); 
		}
		_invalidate(ar);
	},
	validateInternalNetwork:function(){
		var rv = true;
		var nic = false;
		for(var i=0;i<this.panel.find('name','bridgeInterfaces').length;i++){
			if(this.panel.find('name','bridgeInterfaces')[i].getValue()){
				nic = this.panel.find('name','bridgeInterfaces')[i].inputValue;
				break;
			}
		}
		switch(nic){
			case 'router':
				rv = _validate(this.panel.items.items);			
			break;
		}
		return rv;
	},
    saveInternalNetwork : function( handler )
    {
        var value = this.panel.find( "name", "bridgeInterfaces" )[0].getGroupValue();
        
        if ( value == null ) {
            Ext.MessageBox.alert(i18n._( "Select a value" ), i18n._( "Please choose bridge or router." )); 
            return;
        }
                
        var delegate = this.complete.createDelegate( this, [ handler ], true );
        if ( value == 'bridge' ) {
            rpc.networkManager.setWizardNatDisabled( delegate );
        } else {
            var network = this.panel.find( "name", "network" )[0].getValue();
            var netmask = this.panel.find( "name", "netmask" )[0].getValue();
            rpc.networkManager.setWizardNatEnabled( delegate, network, netmask );
        }
    },

    complete : function( result, exception, foo, handler )
    {
        if(exception) {
            Ext.MessageBox.alert(i18n._( "Local Network" ), i18n._( "Unable to save Local Network Settings" ) + exception.message ); 
            return;
        }

        handler();
    }
});

Ung.SetupWizard.Email = Ext.extend( Object, {
    constructor : function( config )
    {
        this.panel = new Ext.FormPanel({
            defaultType : 'textfield',
            defaults : {
                autoHeight : true,
				cls:'noborder',
                labelWidth : Ung.SetupWizard.LabelWidth4,
            },
            items : [{
					xtype:'label',
					html : '<h2 class="wizardTitle">'+i18n._( "Email Configuration" )+'</h2>',
				
			},
			{
				xtype:'label',
				html:i18n._('Your Untangle Server sends email for Quarantine Digests, Reports, etc.')
			},
			{
                xtype : 'button',
                text : i18n._( 'Send Test Email' ),
                handler : this.emailTest,
				cls:'spacingMargin1',
                scope : this,
            },{
                name : 'advanced',
                xtype : 'checkbox',
				cls:'spacingMargin1',
                hideLabel : true,
                value : false,
                boxLabel : i18n._("Advanced Email Configuration."),
                listeners : {
                    check : {
                        fn : function( checkbox, enabled ) {
                            this.onSetMode( enabled );
                        },
                        scope : this
                    }
                }
            },{
                name : 'from-address',
                xtype : "fieldset",
				defaults:{
					validationEvent:'blur',
					msgTarget:'side'
				},
                items : [{
                    name : 'from-address-label',
                    xtype : 'label',
                    html : i18n._( "<b>Please choose a <i>From Address</i> for emails originating from the Untangle Server</b>" )
                },{
                    xtype : 'textfield',
                    name : 'from-address-textfield',
                    fieldLabel : i18n._("From Address"),
					labelStyle : 'margin-top:5px',
					cls:'spacingMargin1',
					vtype:'emailAddressCheck',
					allowBlank:false
                }]
            },{
                name : 'smtp-server-config',
                xtype : "fieldset",
                defaultType : 'textfield',
				defaults:{
					msgTarget:'side'				
				},
                items : [{
                    name : 'smtp-message',
                    xtype : 'label',
                    html : i18n._( "<b>SMTP Configuration</b>" )
                },{
                    xtype : 'radio',
                    name : 'smtp-send-directly',
                    checked : true,
                    inputValue : "directly",
                    boxLabel : i18n._( 'Send Email Directly (default).' ),
                    hideLabel : 'true',
                    listeners : {
                        check : {
                            fn : function( checkbox, checked ) {
                                if ( checked ) this.onSetSendDirectly( true );
                            },
                            scope : this
                        }
                    }
                },{
                    xtype : 'radio',
                    name : 'smtp-send-directly',
                    inputValue : "smtp-server",
                    boxLabel : i18n._( 'Send Email using the specified SMTP server.' ),
                    hideLabel : 'true',
                    listeners : {
                        check : {
                            fn : function( checkbox, checked ) {
                                if ( checked ) this.onSetSendDirectly( false );
                            },
                            scope : this
                        }
                    }
                },{
                    name : 'smtp-server-addr',
                    fieldLabel : i18n._( "SMTP Server" ),
					maskRe:/(\d+|\.)/,					
					vtype:'ipCheck',
					allowBlank:false
                },{
                    name : 'smtp-server-port',
                    xtype : 'numberfield',
                    minValue : 0,
                    maxValue : 65536,
                    allowDecimals : false,
                    fieldLabel : i18n._( 'Port' ),
					allowBlank:false					
                },{
                    name : 'smtp-server-requires-auth',
                    xtype : 'checkbox',
                    hideLabel : true,
                    value : false,
					cls:'wizardlabelmargin4',
                    boxLabel : i18n._("Server Requires Authentication."),
                    listeners : {
                        check : {
                            fn : function( checkbox, checked ) {
                                this.onSetRequiresAuth( checked );
                            },
                            scope : this
                        }
                    }
                },{
						xtype:'textfield',
	                    name : 'smtp-server-username',
	                    fieldLabel : i18n._( "Username" ),
						labelStyle:'margin-left:80px',
						allowBlank:false						
	                },{
	                    name : 'smtp-server-password',
	                    inputType : 'password',
	                    fieldLabel : i18n._( "Password" ),
						labelStyle:'margin-left:80px',
						allowBlank:false						
	                }
				]
            }]
        });

        var field = null;
        this.advancedArray = [];
        this.authArray = [];
        this.directlyArray = [];

        this.advancedArray.push( this.panel.find( "name", "from-address" )[0]);
        this.advancedArray.push( this.panel.find( "name", "smtp-server-config" )[0]);

        this.directlyArray.push( this.panel.find( "name", "smtp-server-addr" )[0]);
        this.directlyArray.push( this.panel.find( "name", "smtp-server-port" )[0]);
        field = this.panel.find( "name", "smtp-server-requires-auth" )[0];
        this.requiresAuth = field;
        this.directlyArray.push( field );

        field = this.panel.find( "name", "smtp-server-username" )[0];
        this.directlyArray.push( field );
        this.authArray.push( field );
        
        field = this.panel.find( "name", "smtp-server-password" )[0];
        this.directlyArray.push( field );
        this.authArray.push( field );

        this.onSetMode( false );
        this.onSetSendDirectly( true );

        this.card = {
            title : i18n._( "Email" ),
            cardTitle : i18n._( "Email Configuration" ),
            panel : this.panel,
            onNext : this.saveSettings.createDelegate( this ),
			onValidate: this.validateEmailConfiguration.createDelegate(this)
        }
    },
    validateEmailConfiguration: function(){
		var rv = true;
		if(this.panel.find('name','advanced')[0].getValue()){//advanced email config checked
			if(!_validate(this.panel.find('name','from-address')[0].items.items)){
				rv = !rv
			}
			if(this.panel.find('name','smtp-send-directly')[1].getValue()){
				if(!_validate(this.directlyArray) && rv){
					rv = !rv;
				}
			}
			if(this.panel.find('name','smtp-server-requires-auth')[0].getValue()){
				if(!_validate(this.authArray) && rv){
					rv = !rv;
				}
			}			

		}

		return rv;	
	},
    onSetMode : function( isAdvanced )
    {	
	    var length = this.advancedArray.length;
        for ( var c = 0 ; c < length ; c++ ) {
            this.advancedArray[c].setDisabled( !isAdvanced );
			if(!isAdvanced){
				_invalidate(this.advancedArray[c].items.items);
			}		
        }
    },

    onSetSendDirectly : function( isSendDirectly )
    {
        var length = this.directlyArray.length;
        for ( var c = 0 ; c < length ; c++ ) {
            this.directlyArray[c].setDisabled( isSendDirectly );
			
        }
		//if(!isSendDirectly){
			_invalidate(this.directlyArray);
		//}
        if ( isSendDirectly ) this.onSetRequiresAuth( this.requiresAuth.getValue());
    },

    onSetRequiresAuth : function( requiresAuth )
    {
        var length = this.authArray.length;
        for ( var c = 0 ; c < length ; c++ ) {
            this.authArray[c].setDisabled( !requiresAuth );			
        }
		if(!requiresAuth){
			_invalidate(this.authArray);
		}		
    },

    saveSettings : function( handler )
    {
        var settings = Ung.SetupWizard.CurrentValues.mailSettings;
        
        settings.fromAddress = "untangle@" + Ung.SetupWizard.CurrentValues.addressSettings.hostName;
        settings.useMxRecords = true;
        settings.smtpHost = "";
        settings.smtpPort = 25;
        settings.authUser = "";
        settings.authPass = "";

        if ( this.panel.find( "name", "advanced" )[0].getValue()) {
            settings.fromAddress = this.panel.find( "name", "from-address-textfield" )[0].getValue();
            
            if ( this.panel.find( "name", "smtp-send-directly" )[0].getGroupValue() == "smtp-server" ) {
                settings.useMxRecords = false;
                settings.smtpHost = this.panel.find( "name", "smtp-server-addr" )[0].getValue();
                settings.smtpPort = this.panel.find( "name", "smtp-server-port" )[0].getValue();
                
                if ( this.panel.find( "name", "smtp-server-requires-auth" )[0].getValue()) {
                    settings.authUser = this.panel.find( "name", "smtp-server-username" )[0].getValue();
                    settings.authPass = this.panel.find( "name", "smtp-server-password" )[0].getValue();
                }
            }
        }

        rpc.mailSender.setMailSettings(this.complete.createDelegate( this, [ handler ], true ), settings );
    },
    
    complete : function( result, exception, foo, handler )
    {
        if ( exception ) {
            Ext.MessageBox.alert(i18n._( "Mail Settings" ),i18n._( "Unable to save settings." ) + exception.message );
            return;
        }

        handler();
    }
});

Ung.SetupWizard.Complete = Ext.extend( Object, {
    constructor : function( config )
    {
        var panel = new Ext.FormPanel({
        items : [{
					xtype:'label',
					html : '<h2 class="wizardTitle">'+i18n._( "Congrats!" )+'</h2>',
				
			},
            {
		            xtype : 'label',
		            html : i18n._( '<b>Your Untangle Server is now configured.</b><br/><br/>You are now ready to login and download some applications.' ),
					cls:'noborder'
			}
		]
    });

        this.card = {
            title : i18n._( "Finished" ),
            cardTitle : i18n._( "Congratulations!" ),
            panel : panel
        }
    }
});

Ung.SetupWizard.PasswordUtil = {
    /* Encode the password and return it as an array of bytes / ints */
    /* @param password Password to encode as a string.
     * @param key Salt to append, this should be an array of 8 bytes.
     */
    encodePassword : function( password, key )
    {
        if ( key.length != 8 ) throw "Invalid key length: " + key.length;
        
        var keyString = "";
        for ( var c = 0 ; c < key.length ; c++ ) keyString += String.fromCharCode( key[c] );
        
        var encoding = hex_md5( password + keyString );
        
        for ( var c = 0 ; c < key.length ; c++ ) encoding += key[c].toString( 16 );

        return encoding;
    }
};

Ung.SetupWizard.TimeZoneStore = [];

Ung.Setup =  {
    init: function() {
        rpc = {};

        /* Initialize the timezone data */
        for ( var i = 0; i < Ung.TimeZoneData.length; i++) {
            Ung.SetupWizard.TimeZoneStore.push([Ung.TimeZoneData[i][0], "(" + Ung.TimeZoneData[i][0] + ") " + Ung.TimeZoneData[i][1]]);
        }
        
        rpc.jsonrpc = new JSONRpcClient("/webui/JSON-RPC");
        
        rpc.languageManager = rpc.jsonrpc.RemoteUvmContext.languageManager();
        rpc.adminManager = rpc.jsonrpc.RemoteUvmContext.adminManager();
        rpc.networkManager = rpc.jsonrpc.RemoteUvmContext.networkManager();
        rpc.connectivityTester = rpc.jsonrpc.RemoteUvmContext.getRemoteConnectivityTester();
        rpc.toolboxManager = rpc.jsonrpc.RemoteUvmContext.toolboxManager();
        rpc.mailSender = rpc.jsonrpc.RemoteUvmContext.mailSender();

        var result = rpc.languageManager.getTranslations( "main" );
        i18n = new Ung.I18N( { "map": result.map })
        
        var welcome = new Ung.SetupWizard.Welcome();
        var settings = new Ung.SetupWizard.Settings();
        var registration = new Ung.SetupWizard.Registration();
        var interfaces = new Ung.SetupWizard.Interfaces();
        var internet = new Ung.SetupWizard.Internet();
        var internal = new Ung.SetupWizard.InternalNetwork();
        var email = new Ung.SetupWizard.Email();
        var complete = new Ung.SetupWizard.Complete();

        this.wizard = new Ung.Wizard({
            height : 500,
            width : 800,
            cardDefaults : {
                labelWidth : Ung.SetupWizard.LabelWidth,
                cls : 'untangle-form-panel'
            },
            cards : [welcome.card,
                     settings.card,
                     registration.card,
                     interfaces.card,
                     internet.card,
                     internal.card,
                     email.card,
                     complete.card
            ],
            disableNext : true,
            el : "container"
			
        });

        this.wizard.render();
		Ext.QuickTips.init();
        this.wizard.goToPage( 4 );
	}
};
