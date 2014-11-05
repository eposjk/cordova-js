/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

module.exports = {
    id: 'win7',
    initialize: function () {
        var cordova = require('cordova'),
            exec = require('cordova/exec'),
            channel = require("cordova/channel"),
            modulemapper = require('cordova/modulemapper'),
            device = require('cordova/plugin/device'),
            storage = require('cordova/plugin/win7/storage');

        modulemapper.loadMatchingModules(/cordova.*\/symbols$/);
        modulemapper.clobbers('cordova/plugin/win7/console', 'console');
        modulemapper.clobbers('cordova/plugin/win7/SQLError', 'SQLError');
        modulemapper.mapModules(window);

        // Inject a listener for the backbutton, and tell native to override the flag (true/false) when we have 1 or more, or 0, listeners
        var backButtonChannel = cordova.addDocumentEventHandler('backbutton');
        backButtonChannel.onHasSubscribersChange = function() {
            // If we just attached the first handler or detached the last handler,
            // let native know we need to override the back button.
            if (this.numHandlers === 1) {
                exec(null, null, "Platform", "backButtonEventOn", []);
            } else if (this.numHandlers === 0) {
                exec(null, null, "Platform", "backButtonEventOff", []);
            }
        };

        channel.onDestroy.subscribe(function () {
            // Remove session storage database
            storage.removeDatabase(device.uuid);
        });

        if (typeof window.openDatabase == 'undefined') {
            window.openDatabase = storage.openDatabase;
        }

        if (typeof window.localStorage == 'undefined' || window.localStorage === null) {
            Object.defineProperty(window, "localStorage", {
                writable: false,
                configurable: false,
                value: new storage.WinStorage('CordovaLocalStorage')
            });
        }

        channel.join(function () {
            if (typeof window.sessionStorage == 'undefined' || window.sessionStorage === null) {
                Object.defineProperty(window, "sessionStorage", {
                    writable: false,
                    configurable: false,
                    value: new storage.WinStorage(device.uuid) // uuid is actually unique for application
                });
            }
        }, [channel.onCordovaInfoReady]);

    }
};
