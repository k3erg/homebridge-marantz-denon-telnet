/**
    @fileoverview Find Denon and marantz and add speaker and switch services.

    @author Mike Kronenberg <mike.kronenberg@kronenberg.org> (http://www.kronenberg.org)
    @license MIT
*/



var MarantzDenonUPnPDiscovery = require('marantz-denon-upnpdiscovery');
var DenonMarantzAVRSwitchAccessory = require('./lib/switchaccessory');
var DenonMarantzAVRSpeakerAccessory = require('./lib/speakeraccessory');
var MarantzDenonTelnet = require('marantz-denon-telnet');



var platform = {
    devicedBlacklist: {},
    devicesDB: {},
    log: function(l) {console.log(l);}
};



var Accessory;
var Service;
var Characteristic;
var UUIDGen;



/**
    Export.
    @param {Homebridge} homebridge .
*/
module.exports = function(homebridge) {

    // Accessory must be created from PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;

    // Service and Characteristic are from hap-nodejs
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    // For platform plugin to be considered as dynamic platform plugin,
    // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
    homebridge.registerPlatform('homebridge-marantz-denon-telnet', 'MarantzDenonTelnetPlatform', MarantzDenonTelnetPlatform, true);
};



/**
    Platform constructor
    @constructor
    @param {Object} log
    @param {Object} config may be null
    @param {Object} api may be null if launched from old homebridge version
 */
function MarantzDenonTelnetPlatform(log, config, api) {
    var platform = this;
    log('Entered Init');

    // see that we have these ready in includes
    this.Accessory = Accessory;
    this.Service = Service;
    this.Characteristic = Characteristic;
    this.UUIDGen = UUIDGen;

    // general
    var platform = this;
    this.devicedBlacklist = {};
    this.devicesDB = {};
    this.log = log;
    this.config = config;
    this.accessories = [];

    log("CONFIG:", JSON.stringify(config));
    
    if (api) {
        // Save the API object as plugin needs to register new accessory via this object.
        this.api = api;

        // Listen to event 'didFinishLaunching', this means homebridge already finished loading cached accessories
        // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
        // Or start discover new accessories
        this.api.on('didFinishLaunching', function() {
            platform.log('DidFinishLaunching');

            var mdf = new MarantzDenonUPnPDiscovery(function(error, device) {   // discover devices
                platform.log('Found Device: ' + device.friendlyName + ' (' + device.ip + ')');
                if (platform.devicesDB[device.mac] || platform.devicedBlacklist[device.mac]) {
                    return;
                }
                platform.addAccessoriesForDevice(device);
            });
        }.bind(this));
    }
}



/**
    Handler will be invoked when user try to config your plugin.
    Callback can be cached and invoke when necessary.
    @param {Objcet} context .
    @param {Object} request .
    @param {Function} callback .
*/
MarantzDenonTelnetPlatform.prototype.configurationRequestHandler = function(context, request, callback) {
  this.log('Context: ', JSON.stringify(context));
  this.log('Request: ', JSON.stringify(request));
/*
  // Check the request response
  if (request && request.response && request.response.inputs && request.response.inputs.name) {
    this.addAccessory(request.response.inputs.name);

    // Invoke callback with config will let homebridge save the new config into config.json
    // Callback = function(response, type, replace, config)
    // set "type" to platform if the plugin is trying to modify platforms section
    // set "replace" to true will let homebridge replace existing config in config.json
    // "config" is the data platform trying to save
    callback(null, "platform", true, {"platform":"SamplePlatform", "otherConfig":"SomeData"});
*/
    return;
};



/**
    Function invoked when homebridge tries to restore cached accessory
    Developer can configure accessory at here (like setup event handler)
    Update current value
    @param {Accessory} accessory .
*/
MarantzDenonTelnetPlatform.prototype.configureAccessory = function(accessory) {
    this.log('Configuring "' + accessory.displayName + '" for: ' + accessory.context.device.friendlyName + ' (' + accessory.context.device.ip + ')');
    var platform = this;

    // set the accessory to reachable if plugin can currently process the accessory
    // otherwise set to false and update the reachability later by invoking
    // accessory.updateReachability()
    // TODO
    accessory.reachable = true;

    platform.devicesDB[accessory.context.device.mac] = accessory.context.device; // prevent readding of this device after new discovery

    // restore functionality
    if (accessory.context.type == 'Switch') {
        DenonMarantzAVRSwitchAccessory.addFunctions(platform, accessory);
    } else {
        DenonMarantzAVRSpeakerAccessory.addFunctions(platform, accessory);
    }

    this.accessories.push(accessory);
};



/**
    Add the accessories for a device.
    @param {Object} device .
*/
MarantzDenonTelnetPlatform.prototype.addAccessoriesForDevice = function(device) {
    this.log('Adding Accessories for Device: ' + device.friendlyName + ' (' + device.ip + ')');
    var platform = this;
    var accessoryByDisplayName = [];
    var zoneId;
    var index;

    // create lookup for existing Accessory
    for (index in this.accessories) {
        accessoryByDisplayName.push(platform.accessories[index].displayName);
    }

    // add general powerswitch
    if (!accessoryByDisplayName.includes('Power')) {
        DenonMarantzAVRSwitchAccessory.create(platform, device);
    }

    // add speaker for all available Zones
    var mdt = new MarantzDenonTelnet(device.ip);
    mdt.getZones(function(error, data) {
        if (data) {
            for (var zoneId in data) {
                DenonMarantzAVRSpeakerAccessory.create(platform, device, zoneId, data[zoneId]);
            }
        }
    });
};



/**
    Really Needed?
    @see https://github.com/nfarina/homebridge/issues/1383
*/
MarantzDenonTelnetPlatform.prototype.updateAccessoriesReachability = function() {
    this.log('Update Reachability');
    for (var index in this.accessories) {
      var accessory = this.accessories[index];
      accessory.updateReachability(false);
    }
};



/**
    Remove Accessory
    TODO should we just alter the reachability instead of removing?
    accessory.updateReachability(false);
    @param {Accessory} accessory .
*/
MarantzDenonTelnetPlatform.prototype.removeAccessory = function(accessory) {
    this.log('removing accessory', accessory.displayName);
    var platform = this;

    platform.api.unregisterPlatformAccessories('homebridge-marantz-denon-telnet', 'MarantzDenonTelnetPlatform', [accessory]);
    platform.accessories.splice(accessories.indexOf('accessory'));
};
