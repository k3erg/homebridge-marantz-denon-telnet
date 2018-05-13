/**
    @fileoverview Add an homebridge platform-accessory with Service.Switch for a marantz / Denon device.

    @author Mike Kronenberg mike.kronenberg@kronenberg.org
    @license MIT
*/



var MarantzDenonTelnet = require('marantz-denon-telnet');



/**
    Add an homebridge platform-accessory with Service.Switch for a Denon / marantz device.
    @param {DenonMarantzAVRPlatform} platform .
    @param {Object} device .
*/
var MarantzDenonTelnetSwitchAccessory = function(platform, device) {
    platform.log('Adding Service.Switch for: ' + device.friendlyName + ' (' + device.ip + ')');
    var Accessory = platform.Accessory;
    var Service = platform.Service;
    var Characteristic = platform.Characteristic;
    var UUIDGen = platform.UUIDGen;
    var uuid = UUIDGen.generate('Switch' + (new Date()).valueOf());
    var accessory = new Accessory(device.friendlyName, uuid);

    // add AccessoryInformation where possible
    accessory
        .getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Name, device.friendlyName)
            .setCharacteristic(Characteristic.Manufacturer, device.manufacturer)
            .setCharacteristic(Characteristic.SerialNumber, device.mac)
            .setCharacteristic(Characteristic.Model, device.model)
            .setCharacteristic(Characteristic.FirmwareRevision, device.firmwareVersion);

    // add persistent info
    accessory.context = {
        type: 'Switch',
        device: device
    };

    // add Services
    accessorySwitchService = accessory.addService(Service.Switch, device.friendlyName);

    // add Functions
    MarantzDenonTelnetSwitchAccessoryAddFunctions(platform, accessory);

    // publish Accessory
    platform.accessories.push(accessory);
    platform.api.registerPlatformAccessories('homebridge-marantz-denon-telnet', 'MarantzDenonTelnetPlatform', [accessory]);
};



/**
    Add an functions.
    @param {DenonMarantzAVRPlatform} platform .
    @param {Accessory} accessory .
*/
var MarantzDenonTelnetSwitchAccessoryAddFunctions = function(platform, accessory) {
    var Service = platform.Service;
    var Characteristic = platform.Characteristic;
    var accessorySwitchService;
    var mdt = new MarantzDenonTelnet(accessory.context.device.ip);

    // indentify
    accessory
        .on('identify', function(paired, callback) {
            platform.log(accessory.displayName, 'Identify');
            callback();
        });

    // add PowerButton
    accessorySwitchService = accessory.getService(Service.Switch);
    accessorySwitchService
        .getCharacteristic(Characteristic.On)
            .on('get', function(callback) {
                platform.log(accessory.displayName, 'Switch.On GET');
                mdt.getPowerState(callback);
            })
            .on('set', function(value, callback) {
                platform.log(accessory.displayName, 'Switch.On SET: ' + value);
                mdt.setPowerState(value, callback);
            });
};



/**
    Export.
*/
module.exports = {
    create: MarantzDenonTelnetSwitchAccessory,
    addFunctions: MarantzDenonTelnetSwitchAccessoryAddFunctions
};
