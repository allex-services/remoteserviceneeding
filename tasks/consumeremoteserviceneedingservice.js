function createConsumeRemoteServiceNeedingService(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      registry = execSuite.registry,
      SinkTask = execSuite.SinkTask,
      taskRegistry = execSuite.taskRegistry;
  function RemoteServiceNeedingServiceConsumer(prophash){
    SinkTask.call(this,prophash);
    this.sink = prophash.sink;
    this.myIP = prophash.myIP;
    if(!this.myIP){
      throw "NO IP!";
    }
    this.services = prophash.servicesTable;
    this.spawner = prophash.spawner;
    this.newServiceListener = prophash.newServiceEvent.attach(this.onNewService.bind(this));
    this.onMissingModule = prophash.onMissingModule;
    this.spawnbid = null;
  }
  lib.inherit(RemoteServiceNeedingServiceConsumer,SinkTask);
  RemoteServiceNeedingServiceConsumer.prototype.__cleanUp = function(){
    if(!this.sink){
      return;
    }
    if(this.spawnbid && this.spawnbid.reject){
      this.spawnbid.reject(new lib.Error('RemoteServiceNeedingService consumer going down'));
    }
    this.spawnbid = null;
    this.onMissingModule = null;
    this.newServiceListener.destroy();
    this.newServiceListener = null;
    this.spawner = null;
    this.services = null;
    this.myIP = null;
    this.sink = null;
    SinkTask.prototype.__cleanUp.call(this);
  };
  RemoteServiceNeedingServiceConsumer.prototype.go = function(){
    var myip = this.myIP;
    if(!myip){
      this.log('will not consume RemoteServiceNeedingService, I have no myIP');
      this.destroy();
    }
    taskRegistry.run('consumeNeedingService',{
      sink:this.sink,
      shouldServeNeeds:function(){return true;},
      shouldServeNeed:this.isNeedBiddable.bind(this),
      bidForNeed: function(needing,defer){defer.resolve({ipaddress:myip});},
      identityForNeed:this.identityForNeed.bind(this),
      respondToChallenge:this.doSpawn.bind(this)
    });
  };
  RemoteServiceNeedingServiceConsumer.prototype.onMissingModuleResult = function(d,result){
    this.log('missing module installed',result);
    if(result){
      d.resolve(true);
    }else{
      d.reject(true);
    }
  };
  RemoteServiceNeedingServiceConsumer.prototype.isNeedBiddable = function(need){
    this.log(this.myIP,need);
    if(this.spawnbid){
      return false;
    }
    if(need && need.ipaddress && this.myIP && need.ipaddress!==this.myIP){
      return false;
    }
    if(!registry.get(need.modulename)){
      return registry.register(need.modulename);
    }
    this.spawnbid = true;
    return true;
  };
  RemoteServiceNeedingServiceConsumer.prototype.identityForNeed = function(need){
    return {name:this.myIP};
  };
  RemoteServiceNeedingServiceConsumer.prototype.doSpawn = function(need,challenge,defer){
    if(this.spawnbid !== true){
      var e = new lib.Error('INTERNAL_ERROR','Cannot spawn twice');
      e.instancename = need.instancename;
      throw e;
    }
    var servobj={service:null};
    if(this.services.some(function(serv){
      if(serv.instancename===need.instancename){
        servobj.service = serv;
        return true;
      }
    })){
      servobj.service.ipaddress = this.myIP;
      defer.resolve(servobj.service);
      return;
    }
    this.spawnbid = defer;
    this.spawner(need,challenge,defer);
  };
  RemoteServiceNeedingServiceConsumer.prototype.onNewService = function(servicerecord){
    var spawnbiddefer = this.spawnbid;
    if(spawnbiddefer){
      this.spawnbid = null;
      servicerecord.ipaddress = this.myIP;
      spawnbiddefer.resolve(servicerecord);
    }
  };
  RemoteServiceNeedingServiceConsumer.prototype.compulsoryConstructionProperties = ['sink','myIP','servicesTable','spawner','newServiceEvent'];
  return RemoteServiceNeedingServiceConsumer;
}

module.exports = createConsumeRemoteServiceNeedingService;
