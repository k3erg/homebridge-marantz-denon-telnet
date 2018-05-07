/**
    @fileoverview Add a homebridge platform-accessory with Service.Speaker for a Denon / marantz device.

    @author Mike Kronenberg mike.kronenberg@kronenberg.org
*/



var MarantzDenonTelnet = require('marantz-denon-telnet');



/**
    Add a homebridge platform-accessory with Service.Speaker for a Denon / marantz device.
    @param {DenonMarantzAVRPlatform} platform .
    @param {Object} device .
    @param {string} zoneId .
    @param {string} zonename .
*/
var MarantzDenonTelnetSpeakerAccessory = function(platform, device, zoneId, zonename) {
    platform.log('Adding Service.Speaker for zone: ' + zonename + ' of '+ device.friendlyName + ' (' + device.ip + ')');

    var Accessory = platform.Accessory;
    var Service = platform.Service;
    var Characteristic = platform.Characteristic;
    var UUIDGen = platform.UUIDGen;
    var uuid = UUIDGen.generate('Speaker' + zoneId + (new Date()).valueOf());
    var accessory = new Accessory(zoneId, uuid);

    // add AccessoryInformation where possible
    accessory
        .getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Name, device.friendlyName + ' ' + zonename + ' Speakers')
            .setCharacteristic(Characteristic.Manufacturer, device.manufacturer)
            .setCharacteristic(Characteristic.SerialNumber, device.mac)
            .setCharacteristic(Characteristic.Model, device.model)
            .setCharacteristic(Characteristic.FirmwareRevision, device.firmwareVersion);

    // add persistent info
    accessory.context = {
        type: 'Speaker',
        device: device,
        zoneId: zoneId
    };

    // add Services
    accessory.addService(Service.Speaker, device.friendlyName + ' ' + zonename + ' Speakers');

    // add Functions
    MarantzDenonTelnetSpeakerAccessoryAddFunctions(platform, accessory);

    // publish Accessory
    platform.accessories.push(accessory);
    platform.api.registerPlatformAccessories('homebridge-marantz-denon-telnet', 'MarantzDenonTelnetPlatform', [accessory]);
};



/**
    Add an functions.
    @param {DenonMarantzAVRPlatform} platform .
    @param {Accessory} accessory .
*/
var MarantzDenonTelnetSpeakerAccessoryAddFunctions = function(platform, accessory) {
    var Service = platform.Service;
    var Characteristic = platform.Characteristic;
    var accessorySpeakerService;
    var mdt = new MarantzDenonTelnet(accessory.context.device.ip);

    // indentify
    accessory
        .on('identify', function(paired, callback) {
            platform.log(accessory.displayName, 'Identify');
            callback();
        });

    // add Speaker
    accessorySpeakerService = accessory.getService(Service.Speaker);
    accessorySpeakerService
        .getCharacteristic(Characteristic.Mute)
            .on('get', function(callback) {
                platform.log(accessory.displayName, 'Speaker.Mute GET');
                mdt.getMuteState(callback, accessory.context.zoneId);
            })
            .on('set', function(value, callback) {
                platform.log(accessory.displayName, 'Speaker.Mute SET: ' + value);
                mdt.setMuteState(
                    value,
                    callback,
                    accessory.context.zoneId);
            });
    accessorySpeakerService
        .getCharacteristic(Characteristic.Volume)
            .on('get', function(callback) {
                platform.log(accessory.displayName, 'Speaker.Volume GET');
                mdt.getVolume(callback, accessory.context.zoneId);
            })
            .on('set', function(value, callback) {
                platform.log(accessory.displayName, 'Speaker.Volume SET: ' + value);
                mdt.setVolume(
                    parseInt(value, 10),
                    callback,
                    accessory.context.zoneId);
            });
};



/**
    Export.
*/
module.exports = {
    create: MarantzDenonTelnetSpeakerAccessory,
    addFunctions: MarantzDenonTelnetSpeakerAccessoryAddFunctions
};
