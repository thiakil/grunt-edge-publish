/*jslint */
/*global AdobeEdge: false, window: false, document: false, console:false, alert: false */
(function (compId) {

    "use strict";
    var im='images/',
        aud='media/',
        vid='media/',
        js='js/',
        fonts = {
        },
        opts = {
            'gAudioPreloadPreference': 'auto',
            'gVideoPreloadPreference': 'auto'
        },
        resources = [
        ],
        scripts = [
        ],
        symbols = {
            "stage": {
                version: "6.0.0",
                minimumCompatibleVersion: "5.0.0",
                build: "6.0.0.400",
                scaleToFit: "none",
                centerStage: "none",
                resizeInstances: false,
                content: {
                    dom: [
                        {
                            id: 'translate',
                            type: 'rect',
                            rect: ['26px', '9px', '131px', '95px', 'auto', 'auto'],
                            fill: ["rgba(192,192,192,1)"],
                            stroke: [0,"rgba(0,0,0,1)","none"]
                        },
                        {
                            id: 'colour',
                            type: 'rect',
                            rect: ['0px', '316px', '131px', '70px', 'auto', 'auto'],
                            fill: ["rgba(192,192,192,1)"],
                            stroke: [0,"rgb(0, 0, 0)","none"]
                        },
                        {
                            id: 'scale',
                            type: 'rect',
                            rect: ['284px', '-10px', '67px', '58px', 'auto', 'auto'],
                            fill: ["rgba(192,192,192,1)"],
                            stroke: [0,"rgb(0, 0, 0)","none"]
                        },
                        {
                            id: 'shadow',
                            type: 'rect',
                            rect: ['452px', '127px', '86px', '95px', 'auto', 'auto'],
                            fill: ["rgba(192,192,192,1)"],
                            stroke: [0,"rgb(0, 0, 0)","none"],
                            boxShadow: ["", -45, -54, 3, 0, "rgba(0,0,0,0.65098)"]
                        },
                        {
                            id: 'path',
                            type: 'rect',
                            rect: ['256px', '222px', '140px', '115px', 'auto', 'auto'],
                            fill: ["rgba(192,192,192,1)"],
                            stroke: [0,"rgb(0, 0, 0)","none"]
                        }
                    ],
                    style: {
                        '${Stage}': {
                            isStage: true,
                            rect: [undefined, undefined, '550px', '400px'],
                            overflow: 'hidden',
                            fill: ["rgba(255,255,255,1)"]
                        }
                    }
                },
                timeline: {
                    duration: 855,
                    autoPlay: true,
                    data: [
                        [
                            "eid19",
                            "location",
                            0,
                            855,
                            "linear",
                            "${path}",
                            [[326, 279.5, 0, 0, 0, 0,0],[105.02, 109.96, 97.9, -153.06, 113.88, -178.04,294.32],[468, 57.5, 0, 0, 0, 0,665.84]]
                        ],
                        [
                            "eid10",
                            "scaleX",
                            0,
                            855,
                            "linear",
                            "${scale}",
                            '1',
                            '0.39'
                        ],
                        [
                            "eid17",
                            "boxShadow.offsetV",
                            0,
                            855,
                            "linear",
                            "${shadow}",
                            '-54px',
                            '3px'
                        ],
                        [
                            "eid16",
                            "boxShadow.offsetH",
                            0,
                            855,
                            "linear",
                            "${shadow}",
                            '-45px',
                            '3px'
                        ],
                        [
                            "eid7",
                            "background-color",
                            0,
                            855,
                            "linear",
                            "${colour}",
                            'rgba(192,192,192,1)',
                            'rgba(231,4,4,1.00)'
                        ],
                        [
                            "eid3",
                            "left",
                            0,
                            855,
                            "linear",
                            "${translate}",
                            '26px',
                            '159px'
                        ],
                        [
                            "eid11",
                            "scaleY",
                            0,
                            855,
                            "linear",
                            "${scale}",
                            '1',
                            '0.39'
                        ],
                        [
                            "eid4",
                            "top",
                            0,
                            855,
                            "linear",
                            "${translate}",
                            '9px',
                            '105px'
                        ]
                    ]
                }
            }
        };

    AdobeEdge.registerCompositionDefn(compId, symbols, fonts, scripts, resources, opts);

    if (!window.edge_authoring_mode) AdobeEdge.getComposition(compId).load("all_edgeActions.js");
})("EDGE-9362843");
