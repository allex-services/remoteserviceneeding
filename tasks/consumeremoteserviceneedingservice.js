function createConsumeRemoteServiceNeedingService(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      registry = execSuite.registry,
      SinkTask = execSuite.SinkTask,
      taskRegistry = execSuite.taskRegistry;
  function servfinder (servobj, need, serv) {
    if(serv.instancename===need.instancename){
      servobj.service = serv;
      return true;
    }
  }
  function SpawnBid () {
    this.spawnbid = true;
  }
  SpawnBid.prototype.destroy = function () {
    if(this.spawnbid && this.spawnbid.reject){
      this.spawnbid.reject(new lib.Error('RemoteServiceNeedingService consumer going down'));
    }
    this.spawnbid = null;
  };
  SpawnBid.prototype.waitingForSpawn = function () {
    return this.spawnbid === true;
  };
  SpawnBid.prototype.ackSpawn = function (defer) {
    this.spawnbid = defer;
  };
  SpawnBid.prototype.resolve = function (thingy) {
    if (this.spawnbid && this.spawnbid.resolve) {
      this.spawnbid.resolve(thingy);
    }
    this.spawnbid = null;
    this.destroy;
  };
  SpawnBid.prototype.reject = function (thingy) {
    if (this.spawnbid && this.spawnbid.reject) {
      this.spawnbid.reject(thingy);
    }
    this.spawnbid = null;
    this.destroy;
  };

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
    this.spawnbids = new lib.Map();
  }
  lib.inherit(RemoteServiceNeedingServiceConsumer,SinkTask);
  RemoteServiceNeedingServiceConsumer.prototype.__cleanUp = function(){
    if(!this.sink){
      return;
    }
    if (this.spawnbids) {
      lib.containerDestroyAll(this.spawnbids);
      this.spawnbids.destroy();
    }
    this.spawnbids = null;
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
      respondToChallenge:this.doSpawn.bind(this),
      serveNeedFailed:this.onServeNeedFailed.bind(this)
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
    var needinstname, spawnbid;
    if (!need) {
      return false;
    }
    needinstname = need.instancename;
    spawnbid = this.spawnbids.get(needinstname);
    if (need.ipaddress) {
      this.log('isNeedBiddable?', this.myIP,need.ipaddress);
    }
    if(spawnbid){
      this.log('need is not biddable, have a spawnbid named', needinstname);
      return false;
    }
    if(need && need.ipaddress && this.myIP) {
      if(need.ipaddress.indexOf('/') > 0) {
        this.log('need to check', this.myIP, 'against', need.ipaddress);
        if(!lib.cidrMatch(this.myIP, need.ipaddress)) {
        this.log('cidr mismatch', need.ipaddress, this.myIP);
          return false;
        }
        this.log('ok');
      } else if(need.ipaddress!==this.myIP){
        this.log('ipaddress mismatch', need.ipaddress, this.myIP);
        return false;
      }
    }
    if(!registry.getClientSide(need.modulename)){
      return registry.registerClientSide(need.modulename);
    }
    this.spawnbids.add(needinstname, new SpawnBid());
    return true;
  };
  RemoteServiceNeedingServiceConsumer.prototype.identityForNeed = function(need){
    return {name:this.myIP};
  };
  RemoteServiceNeedingServiceConsumer.prototype.doSpawn = function(need,challenge,defer){
    var servobj, servfound, _srvobj, _need, spawnbid;
    if (!need) {
      return;
    }
    spawnbid = this.spawnbids.get(need.instancename);
    if(!(spawnbid && spawnbid.waitingForSpawn())){
      console.error('cannot spawn twice!');
      var e = new lib.Error('INTERNAL_ERROR','Cannot spawn twice');
      e.instancename = need.instancename;
      throw e;
    }
    servobj={service:null};
    _srvobj = servobj;
    _need = need;
    servfound = this.services.some(servfinder.bind(null, _srvobj, _need));
    _srvobj = null;
    _need = null;
    if(servfound){
      servobj.service.ipaddress = this.myIP;
      this.log('already have', servobj.service, spawnbid);
      spawnbid.destroy();
      this.spawnbids.remove(need.instancename);
      defer.resolve(servobj.service);
      return;
    }
    spawnbid.ackSpawn(defer);
    this.spawner(need,challenge,defer);
  };
  RemoteServiceNeedingServiceConsumer.prototype.onNewService = function(servicerecord){
    var spawnbid;
    spawnbid = this.spawnbids.remove(servicerecord.instancename);
    if (!spawnbid) {
      return;
    }
    servicerecord.ipaddress = this.myIP;
    spawnbid.resolve(servicerecord);
  };
  RemoteServiceNeedingServiceConsumer.prototype.onServeNeedFailed = function (need) {
    if (!need) {
      return;
    }
    if (!this.spawnbids) {
      return;
    }
    var spawnbid = this.spawnbids.remove(need.instancename);
    if (spawnbid) {
      spawnbid.reject(new lib.Error('SERVE_NEED_FAILED', 'Internal error in serving the Need'));
    }
  };
  RemoteServiceNeedingServiceConsumer.prototype.compulsoryConstructionProperties = ['sink','myIP','servicesTable','spawner','newServiceEvent'];
  return RemoteServiceNeedingServiceConsumer;
}

module.exports = createConsumeRemoteServiceNeedingService;
