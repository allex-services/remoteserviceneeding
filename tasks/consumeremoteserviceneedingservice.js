function createConsumeRemoteServiceNeedingService(execlib){
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
    this.spawnbids = new lib.Map;
  }
  lib.inherit(RemoteServiceNeedingServiceConsumer,SinkTask);
  RemoteServiceNeedingServiceConsumer.prototype.__cleanUp = function(){
    if(!this.spawnbids){
      return;
    }
    this.spawnbids.destroy(); //could reject all remaining defers
    this.spawnbids = null;
    this.newServiceListener.destroy();
    this.newServiceListener = null;
    this.spawner = null;
    this.services = null;
    this.myIP = null;
    this.sink = null;
    SinkTask.prototype.__cleanUp.call(this);
  };
  RemoteServiceNeedingServiceConsumer.prototype.go = function(){
    if(!this.myIP){
      this.log('will not consume RemoteServiceNeedingService, I have no myIP');
      this.destroy();
    }
    taskRegistry.run('consumeNeedingService',{
      sink:this.sink,
      shouldServeNeeds:function(){return true;},
      shouldServeNeed:this.isNeedBiddable.bind(this),
      identityForNeed:this.identityForNeed.bind(this),
      respondToChallenge:this.doSpawn.bind(this)
    });
  };
  RemoteServiceNeedingServiceConsumer.prototype.isNeedBiddable = function(need){
    try{
      registry.register(need.modulename);
    }
    catch(e){
      console.error(e.stack);
      console.error(e);
      return false;
    }
    var ret = !this.spawnbids.get(need.instancename);
    if(!ret){
      console.trace();
      console.error('How come I check on',need.instancename,'again?!');
    }
    return ret;
  };
  RemoteServiceNeedingServiceConsumer.prototype.identityForNeed = function(need){
    return {name:this.myIP};
  };
  RemoteServiceNeedingServiceConsumer.prototype.doSpawn = function(need,challenge,defer){
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
    this.spawnbids.add(need.instancename,defer);
    this.spawner(need,challenge,defer);
  };
  RemoteServiceNeedingServiceConsumer.prototype.onNewService = function(servicerecord){
    var spawnbiddefer = this.spawnbids.remove(servicerecord.instancename);
    if(spawnbiddefer){
      servicerecord.ipaddress = this.myIP;
      spawnbiddefer.resolve(servicerecord);
    }
  };
  RemoteServiceNeedingServiceConsumer.prototype.compulsoryConstructionProperties = ['sink','myIP','servicesTable','spawner','newServiceEvent'];
  return RemoteServiceNeedingServiceConsumer;
}

module.exports = createConsumeRemoteServiceNeedingService;
