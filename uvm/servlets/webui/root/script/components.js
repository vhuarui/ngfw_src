Ext.define("Ung.form.DayOfWeekMatcherField", {
    extend: "Ext.form.CheckboxGroup",
    alias: "widget.udayfield",
    columns: 7,
    width: 700,
    i18n: null,
    isDayEnabled: function (dayOfWeekMatcher, dayInt) {
        if (dayOfWeekMatcher.indexOf("any") != -1)
            return true;
        if (dayOfWeekMatcher.indexOf(dayInt.toString()) != -1)
            return true;
        switch (dayInt) {
          case 1:
            if (dayOfWeekMatcher.indexOf("sunday") != -1)
                return true;
            break;
          case 2:
            if (dayOfWeekMatcher.indexOf("monday") != -1)
                return true;
            break;
          case 3:
            if (dayOfWeekMatcher.indexOf("tuesday") != -1)
                return true;
            break;
          case 4:
            if (dayOfWeekMatcher.indexOf("wednesday") != -1)
                return true;
            break;
          case 5:
            if (dayOfWeekMatcher.indexOf("thursday") != -1)
                return true;
            break;
          case 6:
            if (dayOfWeekMatcher.indexOf("friday") != -1)
                return true;
            break;
          case 7:
            if (dayOfWeekMatcher.indexOf("saturday") != -1)
                return true;
            break;
        }
        return false;
    },
    items: [{
        xtype: 'checkbox',
        name: 'sunday',
        dayId: '1',
        boxLabel: 'Sunday',
        hideLabel: true
    },{
        xtype: 'checkbox',
        name: 'monday',
        dayId: '2',
        boxLabel: 'Monday',
        hideLabel: true
    },{
        xtype: 'checkbox',
        name: 'tuesday',
        dayId: '3',
        boxLabel: 'Tuesday',
        hideLabel: true
    },{
        xtype: 'checkbox',
        name: 'wednesday',
        dayId: '4',
        boxLabel: 'Wednesday',
        hideLabel: true
    },{
        xtype: 'checkbox',
        name: 'thursday',
        dayId: '5',
        boxLabel: 'Thursday',
        hideLabel: true
    },{
        xtype: 'checkbox',
        name: 'friday',
        dayId: '6',
        checked: true,
        boxLabel: 'Friday',
        hideLabel: true
    },{
        xtype: 'checkbox',
        name: 'saturday',
        dayId: '7',
        boxLabel: 'Saturday',
        hideLabel: true
    }],
    arrayContains: function(array, value) {
        for (var i = 0 ; i < array.length ; i++) {
            if (array[i] === value)
                return true;
        }
        return false;
    },
    initComponent: function() {
        var i;
        var initValue = "none";
        if ((typeof this.value) == "string") {
            initValue = this.value.split(",");
        }
        this.value = null;
        for (i = 0 ; i < this.items.length ; i++)
            this.items[i].checked = false;
        for (i = 0 ; i < this.items.length ; i++) {
            var item = this.items[i];
            if ( this.arrayContains(initValue, item.dayId) || this.arrayContains(initValue, item.name) || this.arrayContains(initValue, "any")) {
                item.checked = true;
            }
            item.boxLabel = this.i18n._(item.boxLabel);
        }
        this.callParent(arguments);
    },
    getValue: function() {
        var checkCount = 0;
        var i;
        for (i = 0 ; i < this.items.length ; i++)
            if (this.items.items[i].checked)
                checkCount++;
        if (checkCount == 7)
            return "any";
        var arr = [];
        for (i = 0 ; i < this.items.length ; i++)
            if (this.items.items[i].checked)
                arr.push(this.items.items[i].dayId);
        if (arr.length === 0){
            return "none";
        } else {
            return arr.join();
        }
    }
});

// Defines custom sorting (casting?) comparison functions used when sorting data.
Ung.SortTypes = {
    /**
     * Timestamp sorting
     * @param {Mixed} value The value being converted
     * @return {Number} The comparison value
     */
    asTimestamp: function(value) {
        return value.time;
    },
    /**
     * Ip address sorting. may contain netmask.
     * @param value of the ip field
     * @return {String} The comparison value
     */
    asIp: function(value){
        if(Ext.isEmpty(value)) {
            return null;
        }
        var i, len, parts = (""+value).replace(/\//g,".").split('.');
        for(i = 0, len = parts.length; i < len; i++){
            parts[i] = Ext.String.leftPad(parts[i], 3, '0');
        }
        return parts.join('.');
    }
};

Ext.define("Ung.ConfigItem", {
    extend: "Ext.Component",
    item: null,
    renderTo: 'configItems',
    autoEl: 'div',
    statics: {
        template: new Ext.Template('<div class="icon"><div name="iconCls" class="{iconCls}"></div></div>', '<div class="text text-center">{text}</div>')
    },
    constructor: function(config) {
        this.id = "configItem_" + config.item.name;
        this.callParent(arguments);
    },
    afterRender: function() {
        this.callParent(arguments);
        var html = Ung.ConfigItem.template.applyTemplate({
            'iconCls': this.item.iconClass,
            'text': this.item.displayName
        });
        this.getEl().insertHtml("afterBegin", Ung.AppItem.buttonTemplate.applyTemplate({content:html}));
        this.getEl().addCls("app-item");
        this.getEl().on("click", this.onClick, this);
    },
    onClick: function(e) {
        if (e!=null) {
            e.stopEvent();
        }
        main.openConfig(this.item);
    },
    setIconCls: function(iconCls) {
        this.getEl().down("div[name=iconCls]").dom.className=iconCls;
    }
});

Ext.define("Ung.AppItem", {
    extend: "Ext.Component",
    nodeProperties: null,
    iconSrc: null,
    iconCls: null,
    autoEl: 'div',
    state: null,
    // progress bar component
    progressBar: null,
    subCmps:null,
    download: null,
    statics: {
        template: new Ext.Template('<div class="icon">{imageHtml}</div>', '<div class="text">{text}</div>', '<div id="action_{id}" class="action"></div>', '<div class="state-pos" id="state_{id}"></div>'),
        buttonTemplate: new Ext.Template('<table cellspacing="0" cellpadding="0" border="0" style="width: 100%; height:100%"><tbody><tr><td class="app-item-left"></td><td class="app-item-center">{content}</td><td class="app-item-right"></td></tr></tbody></table>'),
        // update state for the app with a displayName
        updateState: function(displayName, state, options) {
            var app = Ung.AppItem.getApp(displayName);
            main.setAppLastState(displayName, state, options, app!=null?app.download:null);
            if (app != null) {
                app.setState(state, options);
            }
        },
        // get the app item having a item name
        getApp: function(displayName) {
            if (main.apps !== null) {
                return Ext.getCmp("app-item_" + displayName);
            }
            return null;
        }
    },
    constructor: function( nodeProperties, renderPosition) {
        this.subCmps=[];
        this.nodeProperties = nodeProperties;
        this.id = "app-item_" + this.nodeProperties.displayName;
        this.callParent(arguments);
        this.render('appsItems',renderPosition);
    },
    afterRender: function() {
        this.callParent(arguments);

        if (this.nodeProperties.name && this.getEl()) {
            this.getEl().set({
                'name': this.nodeProperties.name
            });
        }
        var imageHtml = null;
        if (this.iconCls == null) {
            if (this.iconSrc == null) {
                this.iconSrc = 'chiclet?name=' + this.nodeProperties.name;
            }
            imageHtml = '<img src="' + this.iconSrc + '" style="vertical-align: middle;"/>';
        } else {
            imageHtml = '<div class="' + this.iconCls + '"></div>';
        }
        var html = Ung.AppItem.template.applyTemplate({
            id: this.getId(),
            'imageHtml': imageHtml,
            'text': this.nodeProperties.displayName
        });
        this.getEl().insertHtml("afterBegin", Ung.AppItem.buttonTemplate.applyTemplate({content:html}));
        this.getEl().addCls("app-item");

        this.progressBar = Ext.create('Ext.ProgressBar',{
            id: 'progressBar_' + this.getId(),
            renderTo: "state_" + this.getId(),
            height: 17,
            width: 140,
            waitDefault: function(updateText) {
                this.reset();
                this.wait({
                    text:  updateText,
                    interval: 100,
                    increment: 15
                });
            }
        });

        this.actionEl = Ext.get("action_" + this.getId());
        this.progressBar.hide();
        if( this.nodeProperties.name != null ) { // FIXME
            this.getEl().on("click", this.installNodeFn, this);
            this.actionEl.insertHtml("afterBegin", i18n._("Install"));
            this.actionEl.addCls("icon-arrow-install");
        } else {
            return;
            // error
        }
        var appsLastState=main.appsLastState[this.nodeProperties.displayName];
        if(appsLastState!=null) {
            this.download=appsLastState.download;
            this.setState(appsLastState.state,appsLastState.options);
        }
    },
    // hack because I cant figure out how to tell extjs to apply style to progress text
    stylizeProgressText: function (str) {
        return '<p style="font-size:xx-small;text-align:left;align:left;padding-left:5px;margin:0px;">' + str + '</p>';
    },
    // set the state of the progress bar
    setState: function(newState, options) {
        var progressString = "";
        var currentPercentComplete;
        var progressIndex;
        switch (newState) {
              case null:
              case "installed":
            this.displayButtonsOrProgress(true);
            this.download=null;
            break;
          case "loadapp":
            this.displayButtonsOrProgress(false);
            progressString = this.stylizeProgressText(i18n._("Loading App..."));
            this.progressBar.waitDefault(progressString);
            break;
        default:
            Ext.MessageBox.alert(i18n._("Warning"),"Unknown state: " + newState);
        }
        this.state = newState;
    },
    // before Destroy
    beforeDestroy: function() {
        this.actionEl.removeAllListeners();
        this.progressBar.reset(true);
        this.progressBar.destroy();
        Ext.each(this.subCmps, Ext.destroy);
        this.callParent(arguments);
    },
    // display Buttons xor Progress barr
    displayButtonsOrProgress: function(displayButtons) {
        this.actionEl.setVisible(displayButtons);
        if (displayButtons) {
            this.getEl().unmask();
            this.progressBar.reset(true);
        } else {
            this.getEl().mask();
            if(!this.progressBar.isVisible()) {
                this.progressBar.show();
            }
        }
    },
    // install node / uninstall App
    installNode: function( completeFn ) {
        if(!this.progressBar.hidden) {
            return;
        }
        main.installNode(this.nodeProperties, this, completeFn);
    },
    // install node / uninstall App
    installNodeFn: function(e) {
        e.preventDefault();
        if(!this.progressBar.hidden) {
            return;
        }
        main.installNode(this.nodeProperties, this);
    }
});

// Node Class
Ext.define("Ung.Node", {
    extend: "Ext.Component",
    statics: {
        // Get node component by nodeId
        getCmp: function(nodeId) {
            return Ext.getCmp("node_" + nodeId);
        },
        getStatusTip: function() {
            return [
                '<div style="text-align: left;">',
                i18n._("The <B>Status Indicator</B> shows the current operating condition of a particular application."),
                '<BR>',
                '<font color="#00FF00"><b>' + i18n._("Green") + '</b></font> ' +
                    i18n._('indicates that the application is "on" and operating normally.'),
                '<BR>',
                '<font color="#FF0000"><b>' + i18n._("Red") + '</b></font> ' +
                    i18n._('indicates that the application is "on", but that an abnormal condition has occurred.'),
                '<BR>',
                '<font color="#FFFF00"><b>' + i18n._("Yellow") + '</b></font> ' +
                    i18n._('indicates that the application is saving or refreshing settings.'), '<BR>',
                '<b>' + i18n._("Clear") + '</b> ' + i18n._('indicates that the application is "off", and may be turned "on" by the user.'),
                '</div>'].join('');
        },
        getPowerTip: function() {
            return i18n._('The <B>Power Button</B> allows you to turn a application "on" and "off".');
        },
        getNonEditableNodeTip: function () {
            return i18n._('This app belongs to the parent rack shown above.<br/> To access the settings for this app, select the parent rack.');
        },
        template: new Ext.Template(
            '<div class="node-cap" style="display:{isNodeEditable}"></div><div class="node-image"><img src="{image}"/></div>', '<div class="node-label">{displayName}</div>',
            '<div class="node-faceplate-info">{licenseMessage}</div>',
            '<div class="node-metrics" id="node-metrics_{id}"></div>',
            '<div class="node-state" id="node-state_{id}" name="State"></div>',
            '<div class="{nodePowerCls}" id="node-power_{id}" name="Power"></div>',
            '<div class="node-buttons" id="node-buttons_{id}"></div>')
    },
    autoEl: "div",
    cls: "node",
    // ---Node specific attributes------
    // node name
    name: null,
    // node image
    image: null,
    // mackage description
    md: null,
    // --------------------------------
    hasPowerButton: null,
    // node state
    state: null, // on, off, attention, stopped
    // is powered on,
    powerOn: null,
    // running state
    runState: null, // RUNNING, INITIALIZED
    // settings Component
    settings: null,
    // settings Window
    settingsWin: null,
    // settings Class name
    settingsClassName: null,
    // list of available metrics for this node/app
    metrics: null,
    // which metrics are shown on the facebplate
    activeMetrics: [0,1,2,3],
    faceplateMetrics: null,
    buttonsPanel: null,
    subCmps: null,
    //can the node be edited on the gui
    isNodeEditable: true,
    constructor: function(config) {
        this.id = "node_" + config.nodeSettings.id;
        config.helpSource=config.displayName.toLowerCase().replace(/ /g,"_");
        if(config.runState==null) {
            config.runState="INITIALIZED";
        }
        this.subCmps = [];
        if( config.nodeSettings.policyId != null ) {
            this.isNodeEditable = (config.nodeSettings.policyId == rpc.currentPolicy.policyId);
        }
        this.callParent(arguments);
    },
    // before Destroy
    beforeDestroy: function() {
        this.getEl().stopAnimation();
        if(this.settingsWin && this.settingsWin.isVisible()) {
            this.settingsWin.closeWindow();
        }
        Ext.each(this.subCmps, Ext.destroy);
        if(this.hasPowerButton) {
            Ext.get('node-power_' + this.getId()).removeAllListeners();
        }
        this.callParent(arguments);
    },
    afterRender: function() {
        this.callParent(arguments);
        main.removeNodePreview(this.name);

        this.getEl().set({
            'viewPosition': this.viewPosition
        });
        this.getEl().set({
            'name': this.displayName
        });
        if(this.fadeIn) {
            var el=this.getEl();
            el.scrollIntoView(Ext.getCmp("center").body);
            el.setOpacity(0.5);
            el.fadeIn({opacity: 1, duration: 2500, callback: function() {
                el.setOpacity(1);
                el.frame("#63BE4A", 1, { duration: 1000 });
            }});
            }
        var nodeButtons=[{
            xtype: "button",
            name: "Show Settings",
            iconCls: 'node-settings-icon',
            text: i18n._('Settings'),
            handler: Ext.bind(function() {
                this.onSettingsAction();
            }, this)
        },{
            xtype: "button",
            name: "Help",
            iconCls: 'icon-help',
            minWidth: 25,
            //text: i18n._('Help'),
            handler: Ext.bind(function() {
                this.onHelpAction();
            }, this)
        },{
            xtype: "button",
            name: "Buy",
            id: 'node-buy-button_'+this.getId(),
            iconCls: 'icon-buy',
            hidden: !(this.license != null && this.license.trial), //show only if trial license
            ctCls:'buy-button-text',
            text: '<font color="green">' + i18n._('Buy Now') + '</font>',
            handler: Ext.bind(this.onBuyNowAction, this)
            }];
        var templateHTML = Ung.Node.template.applyTemplate({
            'id': this.getId(),
            'image': this.image,
            'isNodeEditable': this.isNodeEditable ? "none": "",
            'displayName': this.displayName,
            'nodePowerCls': this.hasPowerButton?((this.license && !this.license.valid)?"node-power-expired":"node-power"):"",
            'licenseMessage': this.getLicenseMessage()
        });
        this.getEl().insertHtml("afterBegin", templateHTML);

        this.buttonsPanel=Ext.create('Ext.panel.Panel',{
            renderTo: 'node-buttons_' + this.getId(),
            border: false,
            bodyStyle: 'background-color: transparent;',
            width: 290,
            buttonAlign: "left",
            layout: 'table',
            layoutConfig: {
                columns: 3
            },
            buttons: nodeButtons
        });
        this.subCmps.push(this.buttonsPanel);
        if(this.hasPowerButton) {
            Ext.get('node-power_' + this.getId()).on('click', this.onPowerClick, this);
            this.subCmps.push(new Ext.ToolTip({
                html: Ung.Node.getStatusTip(),
                target: 'node-state_' + this.getId(),
                showDelay: 20,
                dismissDelay: 0,
                hideDelay: 0
            }));
            this.subCmps.push(new Ext.ToolTip({
                html: Ung.Node.getPowerTip(),
                target: 'node-power_' + this.getId(),
                showDelay: 20,
                dismissDelay: 0,
                hideDelay: 0
            }));
            if(!this.isNodeEditable) {
                this.subCmps.push(new Ext.ToolTip({
                    html: Ung.Node.getNonEditableNodeTip(),
                    target: 'node_' + this.nodeId,
                    showDelay: 20,
                    dismissDelay: 0,
                    hideDelay: 0
                }));
            }
        }
        this.updateRunState(this.runState, true);
        this.initMetrics();
    },
    // is runState "RUNNING"
    isRunning: function() {
        return (this.runState == "RUNNING");
    },
    setState: function(state) {
        this.state = state;
        if(this.hasPowerButton) {
            document.getElementById('node-state_' + this.getId()).className = "node-state icon-state-" + this.state;
        }
    },
    setPowerOn: function(powerOn) {
        this.powerOn = powerOn;
    },
    updateRunState: function(runState, force) {
        if(runState!=this.runState || force) {
            this.runState = runState;
            switch ( runState ) {
              case "RUNNING":
                this.setPowerOn(true);
                this.setState("on");
                break;
              case "INITIALIZED":
              case "LOADED":
                this.setPowerOn(false);
                this.setState("off");
                break;
            default:
                alert("Unknown runState: " + runState);
            }
        }
    },
    updateMetrics: function() {
        if (this.powerOn && this.metrics) {
            if(this.faceplateMetrics!=null) {
                this.faceplateMetrics.update(this.metrics);
            }
        } else {
            this.resetMetrics();
        }
    },
    resetMetrics: function() {
        if(this.faceplateMetrics!=null) {
            this.faceplateMetrics.reset();
        }
    },
    onPowerClick: function() {
        if (!this.powerOn) {
            this.start();
        } else {
            this.stop();
        }
    },
    start: function () {
        if(this.state=="attention") {
            return;
        }
        this.loadNode(Ext.bind(function() {
            this.setPowerOn(true);
            this.setState("attention");
            this.rpcNode.start(Ext.bind(function(result, exception) {
                if(Ung.Util.handleException(exception, Ext.bind(function(message, details) {
                    var title = Ext.String.format( i18n._( "Unable to start {0}" ), this.displayName );
                    Ung.Util.showWarningMessage(title, details);
                }, this),"noAlert")) return;
                this.rpcNode.getRunState(Ext.bind(function(result, exception) {
                    if(Ung.Util.handleException(exception)) return;
                    this.updateRunState(result);
                }, this));
            }, this));
        }, this));
    },
    stop: function () {
        if(this.state=="attention") {
            return;
        }
        this.loadNode(Ext.bind(function() {
            this.setPowerOn(false);
            this.setState("attention");
            this.rpcNode.stop(Ext.bind(function(result, exception) {
                this.resetMetrics();
                if(Ung.Util.handleException(exception)) return;
                this.rpcNode.getRunState(Ext.bind(function(result, exception) {
                    if(Ung.Util.handleException(exception)) return;
                    this.updateRunState(result);
                }, this));
            }, this));
        }, this));
    },
    // on click help
    onHelpAction: function() {
        main.openHelp(this.helpSource);
    },
    // on click settings
    onSettingsAction: function() {
        this.loadSettings();
    },
    //on Buy Now Action
    onBuyNowAction: function() {
        main.openLibItemStore( this.name.replace("-node-","-libitem-"), Ext.String.format(i18n._("More Info - {0}"), this.displayName) );
    },
    getNode: function(handler) {
        if(handler==null) {handler=Ext.emptyFn;}
        if (this.rpcNode === undefined) {
            try {
                this.rpcNode = rpc.nodeManager.node(this.nodeSettings["id"]);
            } catch (e) {
                Ung.Util.rpcExHandler(e);
            }
            handler.call(this);
        } else {
            handler.call(this);
        }
    },
    getNodeProperties: function(handler) {
        if(handler==null) {handler=Ext.emptyFn;}
        if(this.rpcNode == null) {
            return;
        }
        if (this.nodeProperties === undefined) {
            this.rpcNode.getNodeProperties(Ext.Function.createSequence(Ext.bind(function(result, exception) {
                if(Ung.Util.handleException(exception)) return;
                this.nodeProperties = result;
            }, this), handler));
        } else {
            handler.call(this);
        }
    },
    // load Node
    loadNode: function(handler) {
        if(handler==null) {handler=Ext.emptyFn;}
        Ext.bind(this.getNode, this,[Ext.bind(this.getNode, this,[Ext.bind(this.getNodeProperties, this,[handler])])]).call(this);
    },
    loadSettings: function() {
        Ext.MessageBox.wait(i18n._("Loading Settings..."), i18n._("Please wait"));
        this.settingsClassName = Ung.NodeWin.getClassName(this.name);
        if (!this.settingsClassName) {
            // Dynamically load node javaScript
            Ung.NodeWin.loadNodeScript(this, Ext.bind(function() {
                this.settingsClassName = Ung.NodeWin.getClassName(this.name);
                this.initSettings();
            }, this));
        } else {
            this.initSettings();
        }
    },
    // init settings
    initSettings: function() {
        Ext.bind(this.loadNode, this,[Ext.bind(this.initSettingsTranslations, this,[Ext.bind(this.preloadSettings, this)])]).call(this);
    },
    initSettingsTranslations: function(handler) {
        Ung.Util.loadModuleTranslations.call(this, this.name, handler);
    },
    //get node settings async before node settings load
    preloadSettings: function(handler) {
        var nodeExtend = Ext.ClassManager.get("Ung.Node." + this.settingsClassName); 
        if( ( nodeExtend != null ) && 
            Ext.isFunction( nodeExtend.preloadSettings ) ) {
            nodeExtend.preloadSettings(this);
        }else if(Ext.isFunction(this.rpcNode.getSettings)) {
            this.rpcNode.getSettings(Ext.bind(function(result, exception) {
                if(Ung.Util.handleException(exception)) return;
                this.openSettings.call(this, result);
            }, this));
        } else {
            this.openSettings.call(this, null);
        }
    },
    // open settings window
    openSettings: function(settings) {
        var items=null;
        if (this.settingsClassName !== null) {
            this.settingsWin=Ext.create(this.settingsClassName, {'node':this,'tid':this.nodeId,'name':this.name, 'settings': settings});
        } else {
            this.settingsWin = Ext.create('Ung.NodeWin',{
                node: this,
                items: [{
                    anchor: '100% 100%',
                    cls: 'description',
                    bodyStyle: "padding: 15px 5px 5px 15px;",
                    html: Ext.String.format(i18n._("Error: There is no settings class for the node '{0}'."), this.name)
                }]
            });
        }
        this.settingsWin.addListener("hide", Ext.bind(function() {
            if ( Ext.isFunction(this.beforeClose)) {
                this.beforeClose();
            }
            this.destroy();
        }, this.settingsWin));
        this.settingsWin.show();
        Ext.MessageBox.hide();
    },

    // remove node
    removeAction: function() {
        /* A hook for doing something in a node before attempting to remove it */
        if ( this.preRemoveAction ) {
            this.preRemoveAction( this, Ext.bind(this.completeRemoveAction, this ));
            return;
        }

        this.completeRemoveAction();
    },

    completeRemoveAction: function() {
        var message = Ext.String.format(
            i18n._("{0} is about to be removed from the rack.\nIts settings will be lost and it will stop processing network traffic.\n\nWould you like to continue removing?"), this.displayName);
        Ext.Msg.confirm(i18n._("Warning:"), message, Ext.bind(function(btn, text) {
            if (btn == 'yes') {
                if (this.settingsWin) {
                    this.settingsWin.closeWindow();
                }
                this.setState("attention");
                this.getEl().mask();
                this.getEl().fadeOut({ opacity: 0.1, duration: 2500, remove: false, useDisplay:false});
                rpc.nodeManager.destroy(Ext.bind(function(result, exception) {
                    if(Ung.Util.handleException(exception, Ext.bind(function() {
                        this.getEl().unmask();
                        this.getEl().stopAnimation();
                    }, this),"alert")) return;
                    if (this) {
                        if(this.getEl()) {
                            this.getEl().stopAnimation();
                        }
                        var nodeName = this.name;
                        var cmp = this;
                        Ext.destroy(cmp);
                        cmp = null;
                        for (var i = 0; i < main.nodes.length; i++) {
                            if (nodeName == main.nodes[i].name) {
                                main.nodes.splice(i, 1);
                                break;
                            }
                        }
                    }
                    main.updateRackView();
                }, this), this.nodeId);
            }
        }, this));
    },
    // initialize faceplate metrics
    initMetrics: function() {
        if(this.metrics != null && this.metrics.list != null) {
            if( this.metrics.list.length > 0 ) {
                this.faceplateMetrics = Ext.create('Ung.FaceplateMetric', {
                    nodeName: this.name,
                    parentId: this.getId(),
                    parentNodeId: this.nodeId,
                    metrics: this.metrics
                });
                this.faceplateMetrics.render('node-metrics_' + this.getId());
                this.subCmps.push(this.faceplateMetrics);
            }
        }
    },
    getLicenseMessage: function() {
        var licenseMessage = "";
        if (!this.license) {
            return licenseMessage;
        }
        if(this.license.trial) {
            if(this.license.expired) {
                licenseMessage = i18n._("Free trial expired!");
            } else if (this.license.daysRemaining < 2) {
                licenseMessage = i18n._("Free trial.") + " " + i18n._("Expires today.");
            } else if (this.license.daysRemaining < 32) {
                licenseMessage = i18n._("Free trial.") + " " + Ext.String.format("{0} ", this.license.daysRemaining) + i18n._("days remain.");
            } else {
                licenseMessage = i18n._("Free trial.");
            }
        } else { // not a trial
            if (this.license.valid) {
                // if its valid - say if its close to expiring otherwise say nothing
                // if (this.license.daysRemaining < 5) {
                //     licenseMessage = i18n._("Expires in") + Ext.String.format(" {0} ", this.license.daysRemaining) + i18n._("days");
                // }
            } else {
                // if its invalid say the reason
                licenseMessage = this.license.status;
            }
        }
        return licenseMessage;
    },
    updateLicense: function (license) {
        this.license=license;
        this.getEl().down("div[class=node-faceplate-info]").dom.innerHTML=this.getLicenseMessage();
        document.getElementById("node-power_"+this.getId()).className=this.hasPowerButton?(this.license && !this.license.valid)?"node-power-expired":"node-power":"";
        var nodeBuyButton=Ext.getCmp("node-buy-button_"+this.getId());
        if(nodeBuyButton) {
            if(this.license && this.license.trial) {
                nodeBuyButton.show();
            } else {
                nodeBuyButton.hide();
            }
        }
    }
});

Ext.define("Ung.NodePreview", {
    extend: "Ext.Component",
    autoEl: 'div',
    cls: 'node',
    statics: {
        template: new Ext.Template('<div class="node-image"><img src="{image}"/></div>', '<div class="node-label">{displayName}</div>')
    },
    constructor: function(config) {
        this.id = "node_preview_" + config.name;
        this.callParent(arguments);
    },
    afterRender: function() {
        this.getEl().addCls("node");
        this.getEl().set({
            'viewPosition': this.viewPosition
            });
        var templateHTML = Ung.NodePreview.template.applyTemplate({
            'id': this.getId(),
            'image': 'chiclet?name='+this.name,
            'displayName': this.displayName
        });
        this.getEl().insertHtml("afterBegin", templateHTML);
        this.getEl().scrollIntoView(Ext.getCmp("center").body);
        this.getEl().setOpacity(0.1);
        this.getEl().fadeIn({ opacity: 0.6, duration: 12000});
    },
    beforeDestroy: function() {
        this.getEl().stopAnimation();
        this.callParent(arguments);
    }
});

// Metric Manager object
Ung.MetricManager = {
    // update interval in millisecond
    updateFrequency: 3000,
    started: false,
    intervalId: null,
    cycleCompleted: true,
    historyMaxSize:100,
    firstToleratedError: null,
    errorToleranceInterval: 300000, //5 minutes

    start: function(now) {
        this.stop();
        if(now) {
            Ung.MetricManager.run();
        }
        this.setFrequency(this.updateFrequency);
        this.started = true;
    },
    setFrequency: function(timeMs) {
        this.currentFrequency = timeMs;
        if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
        }
        this.intervalId = window.setInterval(function() {Ung.MetricManager.run();}, timeMs);
    },
    stop: function() {
        if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
        }
        this.cycleCompleted = true;
        this.started = false;
    },
    run: function () {
        if (!this.cycleCompleted) {
            return;
        }
        this.cycleCompleted = false;
        rpc.metricManager.getMetricsAndStats(Ext.bind(function(result, exception) {

            if(Ung.Util.handleException(exception, Ext.bind(function() {
                //Tolerate Error 500: Internal Server Error after an install
                //Keep silent for maximum 5 minutes of sequential error messages
                //because apache may reload
                if ( exception.code == 500 || exception.code == 12031 ) {
                    if(this.firstToleratedError==null) {
                        this.firstToleratedError=(new Date()).getTime();
                        this.cycleCompleted = true;
                        return;
                    } else if( ((new Date()).getTime() - this.firstToleratedError ) < this.errorToleranceInterval ) {
                        this.cycleCompleted = true;
                        return;
                    }
                }
                /* After a hostname change and the certificate is regenerated. */
                else if ( exception.code == 12019 ) {
                    Ext.MessageBox.alert(i18n._("System Busy"), "Please refresh the page", Ext.bind(function() {
                        this.cycleCompleted = true;
                    }, this));
                    return;
                }
                // otherwise call handleException but without "noAlert"
                Ung.Util.handleException(exception, Ext.bind(function() {
                    this.cycleCompleted = true;
                }, this));
            }, this),"noAlert")) return;
            this.firstToleratedError=null; //reset error tolerance on a good response
            this.cycleCompleted = true;

            // update system stats
            main.systemStats.update(result.systemStats);
            // upgrade node metrics
            var i;
            for (i = 0; i < main.nodes.length; i++) {
                var nodeCmp = Ung.Node.getCmp(main.nodes[i].nodeId);

                if (nodeCmp && nodeCmp.isRunning()) {
                    nodeCmp.metrics = result.metrics[main.nodes[i].nodeId];
                    nodeCmp.updateMetrics();
                }
            }

        }, this));
    }
};
//Check Store Registration Loop
Ung.CheckStoreRegistration = {
    // update interval in millisecond
    updateFrequency: 2000,
    started: false,
    intervalId: null,
    url: null,
    start: function(now) {
        //this.url = rpc.storeUrl.replace("/open.php","") + "/gui/register/query/uid/" + rpc.jsonrpc.UvmContext.getServerUID();
        //this.url= "http://staging.untangle.com/store/open.php" + "?" + "action=is_registered" + "&" + main.about();
        this.url = rpc.storeUrl + "?" + "action=is_registered" + "&" + main.about();
        this.stop();
        this.intervalId = window.setInterval(Ung.CheckStoreRegistration.run, this.updateFrequency);
        this.started = true;
    },
    stop: function() {
        if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.started = false;
    },
    run: function () {
        Ext.data.JsonP.request({
            url: Ung.CheckStoreRegistration.url,
            type: 'GET',
            success: function(response, opts) {
                if( response!=null && response.registered) {
                    Ung.CheckStoreRegistration.stop();
                    rpc.jsonrpc.UvmContext.setRegistered(function(result, exception) {
                        if(Ung.Util.handleException(exception)) return;
                        main.closeIframe();
                        rpc.isRegistered = true;
                        Ung.CheckStoreRegistration.stop();
                        main.showPostRegistrationPopup();
                    });
                }
            },
            failure: function(response, opts) {
                console.log("Failed to get registered status: ", response, Ung.CheckStoreRegistration.url);
            }
        });
    }
};

Ext.define("Ung.SystemStats", {
    extend: "Ext.Component",
    autoEl: 'div',
    renderTo: "rack-list",
    constructor: function(config) {
        this.id = "system_stats";
        this.callParent(arguments);
    },
    afterRender: function() {
        this.callParent(arguments);
        this.getEl().addCls("system-stats");
        var contentSystemStatsArr=[
            '<div class="label" style="width:100px;left:0px;">'+i18n._("Network")+'</div>',
            '<div class="label" style="width:70px;left:91px;" onclick="main.showSessions()">'+i18n._("Sessions")+'</div>',
            '<div class="label" style="width:60px;left:149px;" onclick="main.showHosts()">'+i18n._("Hosts")+'</div>',
            '<div class="label" style="width:70px;left:198px;">'+i18n._("CPU Load")+'</div>',
            '<div class="label" style="width:75px;left:273px;">'+i18n._("Memory")+'</div>',
            '<div class="label" style="width:40px;right:-5px;">'+i18n._("Disk")+'</div>',
            '<div class="network"><div class="tx">'+i18n._("Tx:")+'<div class="tx-value"></div></div><div class="rx">'+i18n._("Rx:")+'<div class="rx-value"></div></div></div>',
            '<div class="sessions" onclick="main.showSessions()"></div>',
            '<div class="hosts" onclick="main.showHosts()"></div>',
            '<div class="cpu"></div>',
            '<div class="memory"><div class="free">'+i18n._("F:")+'<div class="free-value"></div></div><div class="used">'+i18n._("U:")+'<div class="used-value"></div></div></div>',
            '<div class="disk"><div name="disk_value"></div></div>'
        ];
        this.getEl().insertHtml("afterBegin", contentSystemStatsArr.join(''));

        // network tooltip
        var networkArr=[
            '<div class="title">'+i18n._("TX Speed:")+'</div>',
            '<div class="values"><span name="tx_speed"></span></div>',
            '<div class="title">'+i18n._("RX Speed:")+'</div>',
            '<div class="values"><span name="rx_speed"></span></div>'
        ];
        this.networkToolTip= Ext.create('Ext.tip.ToolTip',{
            target: this.getEl().down("div[class=network]"),
            dismissDelay: 0,
            hideDelay: 400,
            width: 330,
            cls: 'extended-stats',
            renderTo: Ext.getBody(),
            html: networkArr.join('')
        });

        // sessions tooltip
        var sessionsArr=[
            '<div class="title">'+i18n._("Total Sessions:")+'</div>',
            '<div class="values"><span name="totalSessions"></span></div>',
            '<div class="title">'+i18n._("TCP Sessions:")+'</div>',
            '<div class="values"><span name="uvmTCPSessions"></span></div>',
            '<div class="title">'+i18n._("UDP Sessions:")+'</div>',
            '<div class="values"><span name="uvmUDPSessions"></span></div>'
        ];
        this.sessionsToolTip= Ext.create('Ext.tip.ToolTip',{
            target: this.getEl().down("div[class=sessions]"),
            dismissDelay: 0,
            hideDelay: 1000,
            width: 330,
            cls: 'extended-stats',
            renderTo: Ext.getBody(),
            html: sessionsArr.join('')
        });

        // hosts tooltip
        var hostsArr=[
            '<div class="title">'+i18n._("Total Hosts:")+'</div>',
            '<div class="values"><span name="totalHosts"></span></div>'
        ];
        this.hostsToolTip= Ext.create('Ext.tip.ToolTip',{
            target: this.getEl().down("div[class=hosts]"),
            dismissDelay: 0,
            hideDelay: 1000,
            width: 330,
            cls: 'extended-stats',
            renderTo: Ext.getBody(),
            html: hostsArr.join('')
        });
        // cpu tooltip
        var cpuArr=[
            '<div class="title">'+i18n._("Number of Processors / Type / Speed:")+'</div>',
            '<div class="values"><span name="num_cpus"></span>, <span name="cpu_model"></span>, <span name="cpu_speed"></span></div>',
            '<div class="title">'+i18n._("Load average (1 min , 5 min , 15 min):")+'</div>',
            '<div class="values"><span name="load_average_1_min"></span>, <span name="load_average_5_min"></span>, <span name="load_average_15_min"></span></div>',

            '<div class="title">'+i18n._("Tasks (Processes)")+'</div>',
            '<div class="values"><span name="tasks"></span>'+'</div>',
            '<div class="title">'+i18n._("Uptime:")+'</div>',
            '<div class="values"><span name="uptime"></span></div>'
        ];
        this.cpuToolTip= Ext.create('Ext.tip.ToolTip',{
            target: this.getEl().down("div[class=cpu]"),
            dismissDelay: 0,
            hideDelay: 400,
            width: 330,
            cls: 'extended-stats',
            renderTo: Ext.getBody(),
            html: cpuArr.join('')
        });

        // memory tooltip
        var memoryArr=[
            '<div class="title">'+i18n._("Total Memory:")+'</div>',
            '<div class="values"><span name="memory_total"></span> MB</div>',
            '<div class="title">'+i18n._("Memory Used:")+'</div>',
            '<div class="values"><span name="memory_used"></span> MB, <span name="memory_used_percent"></span> %</div>',
            '<div class="title">'+i18n._("Memory Free:")+'</div>',
            '<div class="values"><span name="memory_free"></span> MB, <span name="memory_free_percent"></span> %</div>',
            '<div class="title">'+i18n._("Swap Files:")+'</div>',
            '<div class="values"><span name="swap_total"></span> MB '+i18n._("total swap space")+' (<span name="swap_used"></span> MB '+i18n._("used")+')</div>'
        ];
        this.memoryToolTip= Ext.create('Ext.tip.ToolTip',{
            target: this.getEl().down("div[class=memory]"),
            dismissDelay: 0,
            hideDelay: 400,
            width: 330,
            cls: 'extended-stats',
            renderTo: Ext.getBody(),
            html: memoryArr.join('')
        });

        // disk tooltip
        var diskArr=[
            '<div class="title">'+i18n._("Total Disk Space:")+'</div>',
            '<div class="values"><span name="total_disk_space"></span> GB</div>',
            '<div class="title">'+i18n._("Free Disk Space:")+'</div>',
            '<div class="values"><span name="free_disk_space"></span> GB</div>',
            '<div class="title">'+i18n._("Data read:")+'</div>',
            '<div class="values"><span name="disk_reads"></span> MB, <span name="disk_reads_per_second"></span> b/sec</div>',
            '<div class="title">'+i18n._("Data write:")+'</div>',
            '<div class="values"><span name="disk_writes"></span> MB, <span name="disk_writes_per_second"></span> b/sec</div>'
        ];
        this.diskToolTip = Ext.create('Ext.tip.ToolTip',{
            target: this.getEl().down("div[class=disk]"),
            dismissDelay: 0,
            hideDelay: 400,
            width: 330,
            cls: 'extended-stats',
            renderTo: Ext.getBody(),
            html: diskArr.join('')
        });

    },
    update: function(stats) {
        var toolTipEl;
        var sessionsText = '<font color="#55BA47">' + stats.uvmSessions + "</font>";
        this.getEl().down("div[class=sessions]").dom.innerHTML=sessionsText;
        var hostsText = '<font color="#55BA47">' + stats.hosts + "</font>";
        this.getEl().down("div[class=hosts]").dom.innerHTML=hostsText;
        this.getEl().down("div[class=cpu]").dom.innerHTML=stats.oneMinuteLoadAvg;
        var oneMinuteLoadAvg = stats.oneMinuteLoadAvg;
        var oneMinuteLoadAvgAdjusted = oneMinuteLoadAvg - stats.numCpus;
        var loadText = '<font color="#55BA47">' + i18n._('low') + '</font>';
        if (oneMinuteLoadAvgAdjusted > 1.0) {
            loadText = '<font color="orange">' + i18n._('medium') + '</font>';
        }
        if (oneMinuteLoadAvgAdjusted > 4.0) {
            loadText = '<font color="red">' + i18n._('high') + '</font>';
        }
        this.getEl().down("div[class=cpu]").dom.innerHTML=loadText;

        var txSpeed=(stats.txBps<1000000) ? { value: Math.round(stats.txBps/10)/100, unit:"KB/s" }: {value: Math.round(stats.txBps/10000)/100, unit:"MB/s"};
        var rxSpeed=(stats.rxBps<1000000) ? { value: Math.round(stats.rxBps/10)/100, unit:"KB/s" }: {value: Math.round(stats.rxBps/10000)/100, unit:"MB/s"};
        this.getEl().down("div[class=tx-value]").dom.innerHTML=txSpeed.value+txSpeed.unit;
        this.getEl().down("div[class=rx-value]").dom.innerHTML=rxSpeed.value+rxSpeed.unit;
        var memoryFree=Ung.Util.bytesToMBs(stats.MemFree);
        var memoryUsed=Ung.Util.bytesToMBs(stats.MemTotal-stats.MemFree);
        main.totalMemoryMb = Ung.Util.bytesToMBs(stats.MemTotal);
        this.getEl().down("div[class=free-value]").dom.innerHTML=memoryFree+" MB";
        this.getEl().down("div[class=used-value]").dom.innerHTML=memoryUsed+" MB";
        var diskPercent=Math.round((1-stats.freeDiskSpace/stats.totalDiskSpace)*20 )*5;
        this.getEl().down("div[name=disk_value]").dom.className="disk"+diskPercent;
        if(this.networkToolTip.rendered) {
            toolTipEl=this.networkToolTip.getEl();
            toolTipEl.down("span[name=tx_speed]").dom.innerHTML=txSpeed.value+" "+txSpeed.unit;
            toolTipEl.down("span[name=rx_speed]").dom.innerHTML=rxSpeed.value+" "+rxSpeed.unit;
        }
        if(this.sessionsToolTip.rendered) {
            toolTipEl=this.sessionsToolTip.getEl();
            toolTipEl.down("span[name=totalSessions]").dom.innerHTML=stats.uvmSessions;
            toolTipEl.down("span[name=uvmTCPSessions]").dom.innerHTML=stats.uvmTCPSessions;
            toolTipEl.down("span[name=uvmUDPSessions]").dom.innerHTML=stats.uvmUDPSessions;
        }
        if(this.hostsToolTip.rendered) {
            toolTipEl=this.hostsToolTip.getEl();
            toolTipEl.down("span[name=totalHosts]").dom.innerHTML=stats.hosts;
        }

        if(this.cpuToolTip.rendered) {
            toolTipEl=this.cpuToolTip.getEl();
            toolTipEl.down("span[name=num_cpus]").dom.innerHTML=stats.numCpus;
            toolTipEl.down("span[name=cpu_model]").dom.innerHTML=stats.cpuModel;
            toolTipEl.down("span[name=cpu_speed]").dom.innerHTML=stats.cpuSpeed;
            var uptimeAux=Math.round(stats.uptime);
            var uptimeSeconds = uptimeAux%60;
            uptimeAux=parseInt(uptimeAux/60, 10);
            var uptimeMinutes = uptimeAux%60;
            uptimeAux=parseInt(uptimeAux/60, 10);
            var uptimeHours = uptimeAux%24;
            uptimeAux=parseInt(uptimeAux/24, 10);
            var uptimeDays = uptimeAux;

            toolTipEl.down("span[name=uptime]").dom.innerHTML=(uptimeDays>0?(uptimeDays+" "+(uptimeDays==1?i18n._("Day"):i18n._("Days"))+", "):"") + ((uptimeDays>0 || uptimeHours>0)?(uptimeHours+" "+(uptimeHours==1?i18n._("Hour"):i18n._("Hours"))+", "):"") + uptimeMinutes+" "+(uptimeMinutes==1?i18n._("Minute"):i18n._("Minutes"));
            toolTipEl.down("span[name=tasks]").dom.innerHTML=stats.numProcs;
            toolTipEl.down("span[name=load_average_1_min]").dom.innerHTML=stats.oneMinuteLoadAvg;
            toolTipEl.down("span[name=load_average_5_min]").dom.innerHTML=stats.fiveMinuteLoadAvg;
            toolTipEl.down("span[name=load_average_15_min]").dom.innerHTML=stats.fifteenMinuteLoadAvg;
        }
        if(this.memoryToolTip.rendered) {
            toolTipEl=this.memoryToolTip.getEl();
            toolTipEl.down("span[name=memory_used]").dom.innerHTML=memoryUsed;
            toolTipEl.down("span[name=memory_free]").dom.innerHTML=memoryFree;
            toolTipEl.down("span[name=memory_total]").dom.innerHTML=Ung.Util.bytesToMBs(stats.MemTotal);
            toolTipEl.down("span[name=memory_used_percent]").dom.innerHTML=Math.round((stats.MemTotal-stats.MemFree)/stats.MemTotal*100);
            toolTipEl.down("span[name=memory_free_percent]").dom.innerHTML=Math.round(stats.MemFree/stats.MemTotal*100);

            toolTipEl.down("span[name=swap_total]").dom.innerHTML=Ung.Util.bytesToMBs(stats.SwapTotal);
            toolTipEl.down("span[name=swap_used]").dom.innerHTML=Ung.Util.bytesToMBs(stats.SwapTotal-stats.SwapFree);
        }
        if(this.diskToolTip.rendered) {
            toolTipEl=this.diskToolTip.getEl();
            toolTipEl.down("span[name=total_disk_space]").dom.innerHTML=Math.round(stats.totalDiskSpace/10000000)/100;
            toolTipEl.down("span[name=free_disk_space]").dom.innerHTML=Math.round(stats.freeDiskSpace/10000000)/100;
            toolTipEl.down("span[name=disk_reads]").dom.innerHTML=Ung.Util.bytesToMBs(stats.diskReads);
            toolTipEl.down("span[name=disk_reads_per_second]").dom.innerHTML=Math.round(stats.diskReadsPerSecond*100)/100;
            toolTipEl.down("span[name=disk_writes]").dom.innerHTML=Ung.Util.bytesToMBs(stats.diskWrites);
            toolTipEl.down("span[name=disk_writes_per_second]").dom.innerHTML=Math.round(stats.diskWritesPerSecond*100)/100;
        }
    },
    reset: function() {
    }
});

// Faceplate Metric Class
Ext.define("Ung.FaceplateMetric", {
    extend: "Ext.Component",
    html: '<div class="chart"></div><div class="system"><div class="system-box"></div></div>',
    parentId: null,
    parentNodeId: null,
    data: null,
    byteCountCurrent: null,
    byteCountLast: null,
    sessionCountCurrent: null,
    sessionCountTotal: null,
    sessionRequestLast: null,
    sessionRequestTotal: null,
    hasChart: false,
    chart: null,
    chartData: null,
    chartDataLength: 20,
    chartTip: null,
    afterRender: function() {
            this.callParent(arguments);
        var out = [];
        for (var i = 0; i < 4; i++) {
            var top = 1 + i * 15;
            out.push('<div class="system-label" style="top:' + top + 'px;" id="systemName_' + this.getId() + '_' + i + '"></div>');
            out.push('<div class="system-value" style="top:' + top + 'px;" id="systemValue_' + this.getId() + '_' + i + '"></div>');
        }
        var systemBoxEl=this.getEl().down("div[class=system-box]");
        systemBoxEl.insertHtml("afterBegin", out.join(""));
        this.buildActiveMetrics();
        systemBoxEl.on("click", this.showMetricSettings , this);
        this.buildChart();
    },
    beforeDestroy: function() {
        if(this.chartTip != null) {
            Ext.destroy(this.chartTip);
        }
        if(this.chart != null ) {
            Ext.destroy(this.chart);
        }
        this.callParent(arguments);
    },
    buildChart: function() {
        var i;
        for(i=0; i<this.metrics.list.length; i++) {
            if(this.metrics.list[i].name=="live-sessions") {
                this.hasChart = true;
                break;
            }
        }
        //Do not show chart graph for these apps even though they have the live-sessions metrics
        if(this.nodeName === "untangle-node-firewall" ||
           this.nodeName === "untangle-node-openvpn" ||
           this.nodeName === "untangle-node-splitd") {
                this.hasChart = false;
        }
        var chartContainerEl = this.getEl().down("div[class=chart]");
        //Do not build chart graph if the node doesn't have live-session metrics
        if( !this.hasChart ) {
            chartContainerEl.hide();
            return;
        }

        this.chartData = [];
        for(i=0; i<this.chartDataLength; i++) {
            this.chartData.push({time:i, sessions:0});
        }
        this.chart = Ext.create('Ext.chart.Chart', {
            renderTo: chartContainerEl,
            width: chartContainerEl.getWidth(),
            height: chartContainerEl.getHeight(),
            animate: false,
            theme: 'Green',
            //insetPadding: 11,
            store: Ext.create('Ext.data.JsonStore', {
                fields: ['time', 'sessions'],
                data: this.chartData
            }),
            axes: [{
                type: 'Numeric',
                position: 'left',
                fields: ['sessions'],
                minimum: 0,
                majorTickSteps: 0,
                minorTickSteps: 3
            }],
            series: [{
                type: 'line',
                axis: 'left',
                smooth: true,
                showMarkers: false,
                fill:true,
                xField: 'time',
                yField: 'sessions'
            }]
        });
        this.chart.on("click", function(e) { main.showNodeSessions( this.parentNodeId ); }, this);
        var chartTipArr=[
            '<div class="title">'+i18n._("Session History. Current Sessions:")+' <span name="current_sessions">0</span></div>'
        ];
        this.chartTip=Ext.create('Ext.tip.ToolTip',{
            target: chartContainerEl,
            dismissDelay: 0,
            hideDelay: 400,
            width: 330,
            cls: 'extended-stats',
            renderTo: Ext.getBody(),
            html: chartTipArr.join('')
        });
    },
    buildActiveMetrics: function () {
        var nodeCmp = Ext.getCmp(this.parentId);
        var activeMetrics = nodeCmp.activeMetrics;
        if(activeMetrics.length>4) {
            Ext.MessageBox.alert(i18n._("Warning"), Ext.String.format(i18n._("The node {0} has {1} metrics. The maximum number of metrics is {2}."),nodeCmp.displayName ,activeMetrics.length,4));
        }
        var metricsLen=Math.min(activeMetrics.length,4);
        var i, nameDiv, valueDiv;
        /* set all four to blank */
        for(i=0; i<4;i++) {
            nameDiv=document.getElementById('systemName_' + this.getId() + '_' + i);
            valueDiv=document.getElementById('systemValue_' + this.getId() + '_' + i);
            nameDiv.innerHTML = "&nbsp;";
            nameDiv.style.display="none";
            valueDiv.innerHTML = "&nbsp;";
            valueDiv.style.display="none";
        }
        /* fill in name and value */
        for(i=0; i<metricsLen;i++) {
            var metricIndex=activeMetrics[i];
            var metric = nodeCmp.metrics.list[metricIndex];
            if (metric != null && metric !== undefined) {
                nameDiv=document.getElementById('systemName_' + this.getId() + '_' + i);
                valueDiv=document.getElementById('systemValue_' + this.getId() + '_' + i);
                nameDiv.innerHTML = i18n._(metric.displayName);
                nameDiv.style.display="";
                valueDiv.innerHTML = "&nbsp;";
                valueDiv.style.display="";
            }
        }
    },
    showMetricSettings: function() {
        var nodeCmp = Ext.getCmp(this.parentId);
        this.newActiveMetrics=[];
        var i;
        if(this.configWin==null) {
            var configItems=[];
            for(i=0;i<nodeCmp.metrics.list.length;i++) {
                var metric = nodeCmp.metrics.list[i];
                configItems.push({
                    xtype: 'checkbox',
                    boxLabel: i18n._(metric.displayName),
                    hideLabel: true,
                    name: metric.displayName,
                    dataIndex: i,
                    checked: false,
                    listeners: {
                        "change": {
                            fn: Ext.bind(function(elem, checked) {
                                if(checked && this.newActiveMetrics.length>=4) {
                                    Ext.MessageBox.alert(i18n._("Warning"),i18n._("Please set up to four items."));
                                    elem.setValue(false);
                                    return;
                                }
                                var itemIndex=-1;
                                for(var i=0;i<this.newActiveMetrics.length;i++) {
                                    if(this.newActiveMetrics[i]==elem.dataIndex) {
                                        itemIndex=i;
                                        break;
                                    }
                                }
                                if(checked) {
                                    if(itemIndex==-1) {
                                        // add element
                                        this.newActiveMetrics.push(elem.dataIndex);
                                    }
                                } else {
                                    if(itemIndex!=-1) {
                                        // remove element
                                        this.newActiveMetrics.splice(itemIndex,1);
                                    }
                                }
                            }, this)
                        }
                    }
                });
            }
            this.configWin= Ext.create("Ung.Window", {
                metricsCmp: this,
                modal: true,
                title: i18n._("Set up to four"),
                bodyStyle: "padding: 5px 5px 5px 15px;",
                defaults: {},
                items: configItems,
                autoScroll: true,
                draggable: true,
                resizable: true,
                buttons: [{
                    name: 'Ok',
                    text: i18n._("Ok"),
                    handler: Ext.bind(function() {
                        this.updateActiveMetrics();
                        this.configWin.hide();
                    }, this)
                },{
                    name: 'Cancel',
                    text: i18n._("Cancel"),
                    handler: Ext.bind(function() {
                        this.configWin.hide();
                    }, this)
                }],
                onShow: function() {
                    Ung.Window.superclass.onShow.call(this);
                    this.setSize({width:260,height:280});
                    this.alignTo(this.metricsCmp.getEl(),"tr-br");
                    var pos=this.getPosition();
                    var sub=pos[1]+280-main.viewport.getSize().height;
                    if(sub>0) {
                        this.setPosition( pos[0],pos[1]-sub);
                    }
                }
            });
        }

        for(i=0;i<this.configWin.items.length;i++) {
            this.configWin.items.get(i).setValue(false);
        }
        for(i=0 ; i<nodeCmp.activeMetrics.length ; i++ ) {
            var metricIndex = nodeCmp.activeMetrics[i];
            var metricItem=this.configWin.items.get(metricIndex);
            if (metricItem != null)
                metricItem.setValue(true);
        }
        this.configWin.show();
    },
    updateActiveMetrics: function() {
        var nodeCmp = Ext.getCmp(this.parentId);
        nodeCmp.activeMetrics = this.newActiveMetrics;
        this.buildActiveMetrics();
    },
    update: function(metrics) {
        // UPDATE COUNTS
        var nodeCmp = Ext.getCmp(this.parentId);
        var activeMetrics = nodeCmp.activeMetrics;
        var i;
        for (i = 0; i < activeMetrics.length; i++) {
            var metricIndex = activeMetrics[i];
            var metric = nodeCmp.metrics.list[metricIndex];
            if (metric != null && metric !== undefined) {
                var newValue="&nbsp;";
                newValue = metric.value;
                var valueDiv = document.getElementById('systemValue_' + this.getId() + '_' + i);
                if(valueDiv!=null) {
                    valueDiv.innerHTML = newValue;
                }
            }
        }
        if( this.hasChart && this.chartData != null ) {
            var reloadChart = this.chartData[0].sessions != 0;
            for(i=0;i<this.chartData.length-1;i++) {
                this.chartData[i].sessions=this.chartData[i+1].sessions;
                reloadChart = (reloadChart || (this.chartData[i].sessions != 0));
            }
            var currentSessions = this.getCurrentSessions(nodeCmp.metrics);
            reloadChart = (reloadChart || (currentSessions!=0));
            this.chartData[this.chartData.length-1].sessions=currentSessions;
            if(reloadChart) {
                this.chart.store.loadData(this.chartData);
                if(this.chartTip.rendered) {
                    this.chartTip.getEl().down("span[name=current_sessions]").dom.innerHTML=currentSessions;
                }
            }
        }
    },
    getCurrentSessions: function(metrics) {
        if(this.currentSessionsMetricIndex == null) {
            this.currentSessionsMetricIndex = -1;
            for(var i=0;i<metrics.list.length; i++) {
                if(metrics.list[i].name=="live-sessions") {
                    this.currentSessionsMetricIndex = i;
                    break;
                }
            }
        }
        if(testMode) {
            if(!this.maxRandomNumber) {
                this.maxRandomNumber=Math.floor((Math.random()*200));
            }
            //Just for test generate random data
            return this.currentSessionsMetricIndex>=0?Math.floor((Math.random()*this.maxRandomNumber)):0;
        }
        return this.currentSessionsMetricIndex>=0?metrics.list[this.currentSessionsMetricIndex].value:0;
    },
    reset: function() {
        if (this.chartData != null) {
            var i;
            for(i = 0; i<this.chartData.length; i++) {
                this.chartData[i].sessions=0;
            }
            this.chart.store.loadData(this.chartData);
            for (i = 0; i < 4; i++) {
                var valueDiv = document.getElementById('systemValue_' + this.getId() + '_' + i);
                valueDiv.innerHTML = "&nbsp;";
            }
        }
    }
});

Ext.define("Ung.SelectDateTimeWindow", {
    extend: "Ext.window.Window",
    date: null,
    buttonObj: null,
    modal:true,
    closeAction: 'hide',
    initComponent: function() {
        this.items = [{
            xtype: 'textfield',
            name: 'dateAndTime',
            readOnly: true,
            hideLabel: true,
            width: 180,
            emptyText: this.dateTimeEmptyText
        }, {
            xtype: 'datepicker',
            name: 'date',
            handler: function(picker, date) {
                var timeValue = this.down("timefield[name=time]").getValue();
                if(timeValue != null) {
                    date.setHours(timeValue.getHours());
                    date.setMinutes(timeValue.getMinutes());
                }
                this.setDate(date);
            },
            scope: this
        }, {
            xtype: 'timefield',
            name: 'time',
            hideLabel: true,
            margin: '5px 0 0 0',
            increment: 30,
            width: 180,
            emptyText: i18n._('Time'),
            value: Ext.Date.parse('12:00 AM','h:i A'),
            listeners: {
                change: {
                    fn: function(combo, newValue, oldValue, opts) {
                        if(!this.buttonObj) {
                            return;
                        }
                        if (combo.getValue()!=null) {
                            if(!this.date) {
                                var selDate=this.down("datepicker[name=date]").getValue();
                                if(!selDate) {
                                    selDate=new Date();
                                    selDate.setHours(0,0,0,0);
                                }
                                this.date = new Date(selDate.getTime()+i18n.timeoffset);
                            }
                            this.date.setHours(combo.getValue().getHours());
                            this.date.setMinutes(combo.getValue().getMinutes());
                            this.setDate(this.date);
                        }
                    },
                    scope: this
                }
            }
        }];
        this.buttons = [{
            text: i18n._("Done"),
            handler: function() {
                this.hide();
            },
            scope: this
        }, '->', {
            name: 'Clear',
            text: i18n._("Clear Value"),
            handler: function() {
                this.setDate(null);
                this.hide();
                },
            scope: this
        }];
        this.callParent(arguments);
    },
    setDate: function(date) {
        this.date = date;
        var dateStr ="";
        var buttonLabel = null;
        if(this.date) {
            this.date.setTime(this.date.getTime()-i18n.timeoffset);
            dateStr = i18n.timestampFormat({time: this.date.getTime()});
            buttonLabel = i18n.timestampFormat({time: this.date.getTime()});
        }
        this.down("textfield[name=dateAndTime]").setValue(dateStr);
        if(this.buttonObj) {
            this.buttonObj.setText(buttonLabel!=null?buttonLabel:this.buttonObj.initialLabel);
        }
    }
});

// Navigation Breadcrumbs
Ext.define('Ung.Breadcrumbs', {
    extend:'Ext.Component',
    autoEl: "div",
    // ---Node specific attributes------
    elements: null,
    afterRender: function() {
        this.callParent(arguments);
        if (this.elements != null) {
            for (var i = 0; i < this.elements.length; i++) {
                if (i > 0) {
                    this.getEl().insertHtml('beforeEnd', '<span class="icon-breadcrumbs-separator">&nbsp;&nbsp;&nbsp;&nbsp;</span>');
                }
                var crumb = this.elements[i];
                if (crumb.action) {
                    var crumbEl = document.createElement("span");
                    crumbEl.className = 'breadcrumb-link';
                    crumbEl.innerHTML = crumb.title;
                    crumbEl = Ext.get(crumbEl);
                    crumbEl.on("click", crumb.action, this);
                    this.getEl().appendChild(crumbEl);

                } else {
                    this.getEl().insertHtml('beforeEnd', '<span class="breadcrumb-text" >' + crumb.title + '</span>');
                }
            }
        }
    }
});

Ung.RuleValidator = {
    isSinglePortValid: function(val) {
        /* check for values between 0 and 65536 */
        if ( val < 0 || val > 65536 )
            return false;
        /* verify its an integer (not a float) */
        if( ! /^\d{1,5}$/.test( val ) )
            return false;
        return true;
    },
    isPortRangeValid: function(val) {
        var portRange = val.split('-');
        if ( portRange.length != 2 )
            return false;
        return this.isSinglePortValid(portRange[0]) && this.isSinglePortValid(portRange[1]);
    },
    isPortListValid: function(val) {
        var portList = val.split(',');
        var retVal = true;
        for ( var i = 0; i < portList.length;i++) {
            if ( portList[i].indexOf("-") != -1) {
                retVal = retVal && this.isPortRangeValid(portList[i]);
            } else {
                retVal = retVal && this.isSinglePortValid(portList[i]);
            }
            if (!retVal) {
                return false;
            }
        }
        return true;
    },
    isSingleIpValid: function(val) {
        var ipAddrMaskRe = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipAddrMaskRe.test(val);
    },
    isIpRangeValid: function(val) {
        var ipAddrRange = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)-(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipAddrRange.test(val);
    },
    isCIDRValid: function(val) {
        var cidrRange = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/[0-3]?[0-9]$/;
        return cidrRange.test(val);
    },
    isIpNetmaskValid:function(val) {
        var ipNetmask = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipNetmask.test(val);
    },
    isIpListValid: function(val) {
        var ipList = val.split(',');
        var retVal = true;
        for ( var i = 0; i < ipList.length;i++) {
            if ( ipList[i].indexOf("-") != -1) {
                retVal = retVal && this.isIpRangeValid(ipList[i]);
            } else {
                if ( ipList[i].indexOf("/") != -1) {
                    retVal = retVal && ( this.isCIDRValid(ipList[i]) || this.isIpNetmaskValid(ipList[i]));
                    } else {
                        retVal = retVal && this.isSingleIpValid(ipList[i]);
                    }
            }
            if (!retVal) {
                return false;
            }
        }
        return true;
    }
};