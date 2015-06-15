function createRemoteServiceNeedingServiceTester(execlib,Tester){
  'use strict';
  var lib = execlib.lib,
      q = lib.q;

  function RemoteServiceNeedingServiceTester(prophash,client){
    Tester.call(this,prophash,client);
    console.log('runNext finish');
    lib.runNext(this.finish.bind(this,0));
  }
  lib.inherit(RemoteServiceNeedingServiceTester,Tester);

  return RemoteServiceNeedingServiceTester;
}

module.exports = createRemoteServiceNeedingServiceTester;
