Ext.define('Ung.apps.directoryconnector.MainModel', {
    extend: 'Ext.app.ViewModel',

    alias: 'viewmodel.app-directory-connector',

    data: {
        // title: 'Events'.t(),
        // iconName: 'icon_config_events',

        settings: null,
        record: null

    },

    stores: {
        activeDirectoryServers: { data: '{settings.activeDirectorySettings.servers.list}' }
    }
});
