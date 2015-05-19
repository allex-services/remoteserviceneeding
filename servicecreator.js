function createRemoteServiceNeedingService(execlib,ParentServicePack){
  var ParentService = ParentServicePack.Service,
    dataSuite = execlib.dataSuite;

  function factoryCreator(parentFactory){
    return {
      'service': require('./users/serviceusercreator')(execlib,parentFactory.get('service')),
      'user': require('./users/usercreator')(execlib,parentFactory.get('user')) 
    };
  }

  function RemoteServiceNeedingService(prophash){
    prophash.satisfaction='ipaddress';
    ParentService.call(this,prophash);
  }
  ParentService.inherit(RemoteServiceNeedingService,factoryCreator,require('./storagedescriptor'));
  RemoteServiceNeedingService.prototype.__cleanUp = function(){
    ParentService.prototype.__cleanUp.call(this);
  };
  RemoteServiceNeedingService.prototype.createStorage = function(storagedescriptor){
    return ParentService.prototype.createStorage.call(this,storagedescriptor);
  };
  return RemoteServiceNeedingService;
}

module.exports = createRemoteServiceNeedingService;
