Ext.define('Ung.apps.applicationcontrol.MainController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.app-application-control',

    control: {
        '#': {
            afterrender: 'onAfterRender'
        }
    },

    onAfterRender: function () {
        var me = this;
        me.getView().appManager.getStatistics(function (result, ex) {
            if (ex) { Util.handleException(ex); return; }
            me.getViewModel().set('statistics', result);
        });
        me.getSettings();
    },

    getSettings: function () {
        var v = this.getView(), vm = this.getViewModel();
        v.setLoading(true);
        v.appManager.getSettings(function (result, ex) {
            v.setLoading(false);
            if (ex) { Util.handleException(ex); return; }
            vm.set('settings', result);
        });
    },

    setSettings: function () {
        var me = this, v = this.getView(), vm = this.getViewModel();

        v.query('ungrid').forEach(function (grid) {
            var store = grid.getStore();
            if (store.getModifiedRecords().length > 0 ||
                store.getNewRecords().length > 0 ||
                store.getRemovedRecords().length > 0 ||
                store.isReordered) {
                store.each(function (record) {
                    if (record.get('markedForDelete')) {
                        record.drop();
                    }
                });
                store.isReordered = undefined;
                vm.set(grid.listProperty, Ext.Array.pluck(store.getRange(), 'data'));
            }
        });

        v.setLoading(true);
        v.appManager.setSettings(function (result, ex) {
            v.setLoading(false);
            if (ex) { Util.handleException(ex); return; }
            Util.successToast('Settings saved');
            me.getSettings();
            Ext.fireEvent('resetfields', v);
        }, vm.get('settings'));
    },

    actionRenderer: function(action){
        switch(action.actionType) {
            case 'ALLOW': return 'Allow'.t();
            case 'BLOCK': return 'Block'.t();
            case 'TARPIT': return 'Tarpit'.t();
            default: return 'Unknown Action'.t() + ': ' + act;
        }
    }

});
