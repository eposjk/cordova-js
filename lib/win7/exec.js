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

var cordova = require('cordova');

function jsHandler_exec(successCallback, errorCallback, clazz, action, args) {
    try {
        var plugin = require('cordova/plugin/win7/' + clazz);

        if (plugin && typeof plugin[action] === 'function') {
            var result = plugin[action](successCallback, errorCallback, args);
            return result || { status: cordova.callbackStatus.NO_RESULT };
        }
        // action not found
        return { "status": cordova.callbackStatus.CLASS_NOT_FOUND_EXCEPTION, "message": "Function " + clazz + "::" + action + " cannot be found" };
    } catch (e) {
        // clazz not found
        return { "status": cordova.callbackStatus.CLASS_NOT_FOUND_EXCEPTION, "message": "Function " + clazz + "::" + action + " cannot be found" };
    }
}

module.exports = function exec(success, fail, service, action, args) {
    try {
        // Try JS implementation
        var v = jsHandler_exec(success, fail, service, action, args);

        // If status is OK, then return value back to caller
        if (v.status == cordova.callbackStatus.OK) {

            // If there is a success callback, then call it now with returned value
            if (success) {
                try {
                    success(v.message);
                }
                catch (e) {
                    console.log("Error in success callback: " + service + "." + action + " = " + e);
                }

            }
            return v.message;
        } else if (v.status == cordova.callbackStatus.NO_RESULT) {
            // Nothing to do here
        } else if (v.status == cordova.callbackStatus.CLASS_NOT_FOUND_EXCEPTION) {
            // Try native implementation
            var callbackId = service + cordova.callbackId++;
            if (typeof success == 'function' || typeof fail == 'function') {
                cordova.callbacks[callbackId] = { success: success, fail: fail };
            }

            try {
                if (window.external) {
                    return window.external.CordovaExec(callbackId, service, action, JSON.stringify(args));
                }
                else {
                    console.log('window.external not available');
                }
            }
            catch (e) {
                console.log('Exception calling native with for ' + service + '/' + action + ' - exception = ' + e);
                // Clear callback
                delete cordova.callbacks[callbackId];
            }
        } else {
            // If error, then display error
            console.log("Error: " + service + "." + action + " Status=" + v.status + " Message=" + v.message);

            // If there is a fail callback, then call it now with returned value
            if (fail) {
                try {
                    fail(v.message);
                }
                catch (e) {
                    console.log("Error in error callback: " + service + "." + action + " = " + e);
                }
            }
            return null;
        }
    } catch (e) {
        console.log('Exception calling native with for ' + service + '/' + action + ' - exception = ' + e);
    }
};