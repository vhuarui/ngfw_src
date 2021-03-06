Ext.define('Ung.view.reports.MainController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.reports',

    control: {
        '#': { afterrender: 'onAfterRender', deactivate: 'resetView' }
    },

    listen: {
        global: {
            init: 'onInit'
        }
    },

    onAfterRender: function () {
        this.getView().setLoading(true);
    },

    onInit: function () {
        var me = this, vm = me.getViewModel(), path = '', node;

        // set the context (ADMIN or REPORTS)
        vm.set('context', Ung.app.context);

        me.getView().setLoading(false);

        me.buildTablesStore();
        vm.bind('{hash}', function (hash) {
            if (!hash) { me.resetView(); return; }

            // on create new report reset and apply new entry
            if (hash === 'create') {
                me.getViewModel().set('selection', null);
                me.resetView();
                me.getView().down('entry').getController().reset();
                me.getView().down('entry').getViewModel().set({
                    entry: null,
                    eEntry: Ext.create('Ung.model.Report')
                });
                me.lookup('cards').setActiveItem('report');
                return;
            }

            if (Ung.app.context === 'REPORTS') {
                path = '/reports/' + window.location.hash.replace('#', '');
                node = Ext.getStore('reportstree').findNode('url', window.location.hash.replace('#', ''));
            } else {
                path = window.location.hash.replace('#', '');
                node = Ext.getStore('reportstree').findNode('url', window.location.hash.replace('#reports/', ''));
            }

            // selected node icon/text for category stats
            vm.set('selection', { icon: node.get('icon'), text: node.get('text') });

            // breadcrumb selection
            me.lookup('breadcrumb').setSelection(node);

            // tree selection
            me.lookup('tree').collapseAll();
            me.lookup('tree').selectPath(path, 'slug', '/', Ext.emptyFn, me);

            me.showNode(node); // shows the selected report or category stats
        });
        vm.bind('{fetching}', function (val) {
            if (!val) { Ext.MessageBox.hide(); } // hide any loading message box
        });
    },

    buildTablesStore: function () {
        if (!rpc.reportsManager) { return; }
        var me = this, vm = me.getViewModel();
        Rpc.asyncData('rpc.reportsManager.getTables').then(function (result) {
            vm.set('tables', result); // used in advanced report settings table name
        });
    },

    // check if data is fetching and cancel selection if true
    beforeSelectReport: function (el, node) {
        var me = this, vm = me.getViewModel();
        if (vm.get('fetching')) {
            Ext.MessageBox.wait('Data is fetching...'.t(), 'Please wait'.t(), { text: '' });
            return false;
        }
        if (Ung.app.context === 'REPORTS') {
            Ung.app.redirectTo('#' + node.get('url'));
        } else {
            Ung.app.redirectTo('#reports/' + node.get('url'));
        }
    },

    showNode: function (node) {
        var me = this, record;

        if (node.isLeaf()) {
            // report node
            record = Ext.getStore('reports').findRecord('url', node.get('url'), 0, false, true, true);
            if (record) {
                me.getView().down('entry').getViewModel().set({
                    entry: record
                });
            }
            me.lookup('cards').setActiveItem('report');
        } else {
            me.lookup('cards').setActiveItem('category');
            me.buildStats(node);
            node.expand();
        }
    },


    /**
     * the tree item renderer used after filtering tree
     */
    treeNavNodeRenderer: function(value, meta, record) {
        // if (!record.isLeaf()) {
        //     meta.tdCls = 'x-tree-category';
        // }
        // if (!record.get('readOnly') && record.get('uniqueId')) {
        //     meta.tdCls = 'x-tree-custom-report';
        // }
        return this.rendererRegExp ? value.replace(this.rendererRegExp, '<span style="font-weight: bold; background: #EEE; color: #000; border-bottom: 1px #000 solid;">$1</span>') : value;
    },

    /**
     * filters reports tree
     */
    filterTree: function (field, value) {
        var me = this, tree = me.lookup('tree');
        me.rendererRegExp = new RegExp('(' + value + ')', 'gi');

        if (!value) {
            tree.getStore().clearFilter();
            tree.collapseAll();
            field.getTrigger('clear').hide();
            return;
        }

        tree.getStore().getFilters().replaceAll({
            property: 'text',
            value: new RegExp(Ext.String.escape(value), 'i')
        });
        tree.expandAll();
        field.getTrigger('clear').show();
    },

    onTreeFilterClear: function () {
        this.lookup('tree').down('textfield').setValue();
    },

    /**
     * resets the view to an initial state
     */
    resetView: function () {
        var me = this, tree = me.lookup('tree'), breadcrumb = me.lookup('breadcrumb');
        tree.collapseAll();
        tree.getSelectionModel().deselectAll();
        tree.getStore().clearFilter();
        tree.down('textfield').setValue('');

        breadcrumb.setSelection('root');

        if (me.getViewModel().get('hash') !== 'create') {
            me.buildStats();
            me.lookup('cards').setActiveItem('category');
            me.getViewModel().set('selection', null);
            me.getViewModel().set('hash', null);
        }
    },

    /**
     * builds statistics for categories
     */
    buildStats: function (node) {
        var me = this, vm = me.getViewModel(),
            stats = {
                set: false,
                reports: {
                    total: 0,
                    custom: 0,
                    chart: 0,
                    event: 0,
                    info: 0
                },
                categories: {
                    total: 0,
                    app: 0
                }
            };

        if (!node) { node = Ext.getStore('reportstree').getRoot(); }

        node.cascade(function (n) {
            if (n.isRoot()) { return; }
            if (n.isLeaf()) {
                stats.reports.total += 1;
                if (!n.get('readOnly')) { stats.reports.custom += 1; }
                switch(n.get('type')) {
                case 'TIME_GRAPH':
                case 'TIME_GRAPH_DYNAMIC':
                case 'PIE_GRAPH':
                    stats.reports.chart += 1; break;
                case 'EVENT_LIST':
                    stats.reports.event += 1; break;
                case 'TEXT':
                    stats.reports.info += 1; break;
                }
            } else {
                stats.categories.total += 1;
                if (n.get('type') === 'app') {
                    stats.categories.app += 1;
                }
            }
        });
        vm.set('stats', stats);
    },

    // on new report just redirect to proper route
    newReport: function () {
        Ung.app.redirectTo('#reports/create');
    },

    newImport: function () {
        var me = this;
        var dialog = me.getView().add({
            xtype: 'importdialog'
        });
        dialog.show();
    },


    exportCategoryReports: function () {
        var me = this, vm = me.getViewModel(), reportsArr = [], category, reports;

        if (vm.get('selection')) {
            category = vm.get('selection.text'); // selected category
            reports = Ext.getStore('reports').query('category', category, false, true, true);
        } else {
            // export all
            reports = Ext.getStore('reports').getData();
        }

        Ext.Array.each(reports.items, function (report) {
            var rep = report.getData();
            // remove extra custom fields
            delete rep._id;
            delete rep.localizedTitle;
            delete rep.localizedDescription;
            delete rep.slug;
            delete rep.categorySlug;
            delete rep.url;
            delete rep.icon;
            reportsArr.push(rep);
        });

        Ext.MessageBox.wait('Exporting Settings...'.t(), 'Please wait'.t());
        var exportForm = document.getElementById('exportGridSettings');
        exportForm.gridName.value = 'AllReports'.t() + (category ? '_' + category.replace(/ /g, '_') : ''); // used in exported file name
        exportForm.gridData.value = Ext.encode(reportsArr);
        exportForm.submit();
        Ext.MessageBox.hide();
    }


});
