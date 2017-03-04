Ext.define('Ung.apps.firewall.view.Status', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.app-firewall-status',
    itemId: 'status',
    title: 'Status'.t(),

    layout: 'border',
    items: [{
        region: 'center',
        border: false,
        bodyPadding: 10,
        scrollable: 'y',
        items: [{
            xtype: 'component',
            cls: 'app-desc',
            html: '<img src="/skins/modern-rack/images/admin/apps/untangle-node-firewall_80x80.png" width="80" height="80"/>' +
                '<h3>Firewall</h3>' +
                '<p>' + 'Firewall is a simple application that flags and blocks sessions based on rules.'.t() + '</p>'
        }, {
            xtype: 'appstate',
        }, {
            xtype: 'appreports'
        }, {
            xtype: 'appremove'
        }]
    }, {
        region: 'west',
        border: false,
        width: 350,
        minWidth: 300,
        split: true,
        layout: 'border',
        // layout: {
        //     type: 'hbox'
        // },
        items: [{
            xtype: 'appmetrics',
            region: 'center'
        }]
    }]

});