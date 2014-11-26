/*
 * Copyright (c) Microsoft Open Technologies, Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use these files except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var exec = require('cordova/exec'),
    Database = require('cordova/plugin/win7/Database');

// http://www.w3.org/TR/webdatabase/
var WebSQL = {};

// Database openDatabase(in DOMString name, in DOMString version, in DOMString displayName, in unsigned long estimatedSize, in optional DatabaseCallback creationCallback
// http://www.w3.org/TR/webdatabase/#databases
WebSQL.openDatabase = window.openDatabase || function (name, version, displayName, estimatedSize, creationCallback) {
    if(window.__webSqlDebugModeOn === true)
        console.log('openDatabase: name = ' + name);
    return new Database(name, version, displayName, estimatedSize, creationCallback);
};

WebSQL.removeDatabase = function (name) {
    exec(null, null, "WebSql", "removeDatabase", [name]);
};

module.exports = WebSQL;
