function createRemoteServiceNeedingUserTester(execlib,Tester){
  'use strict';
  var lib = execlib.lib,
      q = lib.q;

  function RemoteServiceNeedingUserTester(prophash,client){
    Tester.call(this,prophash,client);
    console.log('runNext finish');
    lib.runNext(this.finish.bind(this,0));
  }
  lib.inherit(RemoteServiceNeedingUserTester,Tester);

  return RemoteServiceNeedingUserTester;
}

module.exports = createRemoteServiceNeedingUserTester;
