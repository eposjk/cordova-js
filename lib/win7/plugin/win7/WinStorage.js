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

var channel = require("cordova/channel"),
    utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    WebSQL = require('cordova/plugin/win7/WebSql');

var WinStorage = function (dbName) {
    channel.waitForInitialization("winStorage" + dbName);

    try {

        this.db = openDatabase(dbName, '1.0', dbName, 2621440);
        var storage = {}, self = this;
        this.length = 0;
        this.db.transaction(
            function (transaction) {
                var i;
                transaction.executeSql('PRAGMA encoding = "UTF-8"');
                transaction.executeSql('CREATE TABLE IF NOT EXISTS storage (id VARCHAR(40) PRIMARY KEY, body VARCHAR(255))');
                transaction.executeSql('SELECT * FROM storage', [], function (tx, result) {
                    for (var i = 0; i < result.rows.length; i++) {
                        storage[result.rows.item(i).id] = result.rows.item(i).body;
                    }
                    self.length = result.rows.length;
                    channel.initializationComplete("winStorage" + dbName);
                });

            },
            function (err) {
                utils.alert(err.message);
            }
        );
        this.setItem = function (key, val) {
            if (typeof (storage[key]) == 'undefined') {
                this.length++;
            }
            storage[key] = val;
            this.db.transaction(
          function (transaction) {
              transaction.executeSql('REPLACE INTO storage (id, body) values(?,?)', [key, val]);
          }
        );
        };
        this.getItem = function (key) {
            return (typeof (storage[key]) == 'undefined') ? null : storage[key];
        };
        this.removeItem = function (key) {
            delete storage[key];
            this.length--;
            this.db.transaction(
          function (transaction) {
              transaction.executeSql('DELETE FROM storage where id=?', [key]);
          }
        );
        };
        this.clear = function () {
            storage = {};
            this.length = 0;
            this.db.transaction(
          function (transaction) {
              transaction.executeSql('DELETE FROM storage', []);
          }
        );
        };
        this.key = function (index) {
            var i = 0;
            for (var j in storage) {
                if (i == index) {
                    return j;
                } else {
                    i++;
                }
            }
            return null;
        };

    } catch (e) {
        utils.alert("Database error " + e + ".");
        return;
    }
};

module.exports = WinStorage;
