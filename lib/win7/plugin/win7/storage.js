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
    exec = require('cordova/exec');

var Rows = function () {
    this.resultSet = [];    // results array
    this.length = 0;        // number of rows
};

Rows.prototype.item = function (row) {
    return this.resultSet[row];
};

var Result = function () {
    this.rows = new Rows();
};

var Query = function (tx) {

    // Set the id of the query
    this.id = utils.createUUID();

    // Init result
    this.resultSet = [];

    // Set transaction that this query belongs to
    this.tx = tx;

    // Add this query to transaction list
    this.tx.queryList[this.id] = this;

    // Callbacks
    this.successCallback = null;
    this.errorCallback = null;

};

Query.prototype.complete = function(data) {
    var id = this.id;
    try {
        // Get transaction
        var tx = this.tx;

        // If transaction hasn't failed
        // Note: We ignore all query results if previous query
        //       in the same transaction failed.
        if (tx && tx.queryList[id]) {

            // Save query results
            var r = new Result();
            r.rows.resultSet = data;
            r.rows.length = data.length;
            try {
                if (typeof this.successCallback === 'function') {
                    this.successCallback(tx, r);
                }
            } catch (ex) {
                console.log("executeSql error calling user success callback: " + ex);
            }

            tx.queryComplete(id);
        }
    } catch (e) {
        console.log("executeSql error: " + e);
    }
};

Query.prototype.fail = function(error) {
    var id = this.id;
    try {
        // Get transaction
        var tx = this.tx;

        // If transaction hasn't failed
        // Note: We ignore all query results if previous query
        //       in the same transaction failed.
        if (tx && tx.queryList[id]) {
            tx.queryList = {};

            try {
                if (typeof this.errorCallback === 'function') {
                    this.errorCallback(tx, error);
                }
            } catch (ex) {
                console.log("executeSql error calling user error callback: " + ex);
            }

            tx.queryFailed(id, error);
        }

    } catch (e) {
        console.log("executeSql error: " + e);
    }
};

var Transaction = function (database) {
    this.db = database;
    // Set the id of the transaction
    this.id = utils.createUUID();

    // Callbacks
    this.successCallback = null;
    this.errorCallback = null;

    // Query list
    this.queryList = {};
};

Transaction.prototype.queryComplete = function (id) {
    delete this.queryList[id];

    // If no more outstanding queries, then fire transaction success
    if (this.successCallback) {
        var count = 0;
        var i;
        for (i in this.queryList) {
            if (this.queryList.hasOwnProperty(i)) {
                count++;
            }
        }
        if (count === 0) {
            try {
                this.successCallback();
            } catch (e) {
                console.log("Transaction error calling user success callback: " + e);
            }
        }
    }
};

Transaction.prototype.queryFailed = function (id, error) {

    // The sql queries in this transaction have already been run, since
    // we really don't have a real transaction implemented in native code.
    // However, the user callbacks for the remaining sql queries in transaction
    // will not be called.
    this.queryList = {};

    if (this.errorCallback) {
        try {
            this.errorCallback(error);
        } catch (e) {
            console.log("Transaction error calling user error callback: " + e);
        }
    }
};

Transaction.prototype.executeSql = function (sql, params, successCallback, errorCallback) {
    // Init params array
    if (typeof params === 'undefined') {
        params = [];
    }

    // Create query and add to queue
    var query = new Query(this);

    // Save callbacks
    query.successCallback = successCallback;
    query.errorCallback = errorCallback;

    // Call native code
    exec(function(data) {
            query.complete(data);
        },
        function(error) {
            query.fail(error);
        },
        "Storage",
        "executeSql",
        [this.db.id, sql, params, query.id]
    );
};

var Database = function (dbId) {
    this.id = dbId;
};

Database.prototype.transaction = function (process, errorCallback, successCallback) {
    var tx = new Transaction(this);
    tx.successCallback = successCallback;
    tx.errorCallback = errorCallback;

    try {
        process(tx);
    } catch (e) {
        console.log("Transaction error: " + e);
        if (tx.errorCallback) {
            try {
                tx.errorCallback(e);
            } catch (ex) {
                console.log("Transaction error calling user error callback: " + e);
            }
        }
    }
};

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

function openDatabase(name, version, display_name, size) {
    var dbId = exec(null, null, "Storage", "openDatabase", [name, version, display_name, size]);
    return new Database(dbId);
}

function removeDatabase(name) {
    exec(null, null, "Storage", "removeDatabase", [name]);
}

module.exports = {
    openDatabase: openDatabase,
    removeDatabase: removeDatabase,
    WinStorage: WinStorage
};