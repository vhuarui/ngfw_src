{
    "uniqueId": "web-monitor-P3PSUGFTIY",
    "category": "Web Monitor",
    "readOnly": true,
    "type": "EVENT_LIST",
    "conditions": [
        {
            "column": "web_filter_flagged",
            "javaClass": "com.untangle.node.reports.SqlCondition",
            "operator": "is",
            "value": "TRUE"
        }
    ],
    "defaultColumns": ["time_stamp","hostname","username","host","uri","web_filter_blocked","web_filter_flagged","web_filter_reason","web_filter_category","c_client_addr","s_server_addr","s_server_port"],
    "description": "Shows all flagged web requests.",
    "displayOrder": 1011,
    "javaClass": "com.untangle.node.reports.ReportEntry",
    "table": "http_events",
    "title": "Flagged Web Events"
}