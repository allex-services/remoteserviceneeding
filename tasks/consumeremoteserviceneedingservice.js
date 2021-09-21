function createConsumeRemoteServiceNeedingService(execlib, portjobslib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      qlib = lib.qlib,
      JobBase = qlib.JobBase,
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
  function servfinderbyinstancename (servobj, instancename, serv) {
    if (serv.instancename === instancename) {
      servobj.service = serv;
      return true;
    }
  }
  function SpawnBid () {
    this.spawnbid = true;
    this.spawndescriptor = null;
  }
  SpawnBid.prototype.destroy = function () {
    this.spawndescriptor = null;
    if(this.spawnbid && this.spawnbid.reject){
      this.spawnbid.reject(new lib.Error('REMOTE_SERVICE_NEEEDING_SERVICE_DESTROYING', 'RemoteServiceNeedingService consumer going down'));
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
    if (this.spawndescriptor) {
      return;
    }
    this.spawndescriptor = thingy;
    if (this.spawnbid && this.spawnbid.resolve) {
      this.checkPostSpawn();
      return;
    }
    this.spawnbid = null;
    this.destroy();
  };
  SpawnBid.prototype.reject = function (thingy) {
    if (this.spawnbid && this.spawnbid.reject) {
      this.spawnbid.reject(thingy);
    }
    this.spawnbid = null;
    this.destroy();
  };
  SpawnBid.prototype.checkPostSpawn = function () {
    //this.spawnbid.resolve(thingy);
    if (!this.spawndescriptor) {
      this.spawnbid.resolve(this.spawndescriptor);
      return;
    }
    (new portjobslib.Repeatable(
      portjobslib.spawnDescriptorToPorts(this.spawndescriptor),
      portjobslib.AnyTaken,
      10,
      lib.intervals.Second,
      function(anytaken) {return anytaken;}
    )).go().done(
      this.onCheckPostSpawn.bind(this),
      this.onCheckPostSpawnFailed.bind(this)
    );
  };
  SpawnBid.prototype.onCheckPostSpawn = function (isok) {
    if (isok) {
      this.spawnbid.resolve(this.spawndescriptor);
      return;
    }
    this.spawnbid.reject(new lib.Error('UNSUCCESSFUL_SERVICE_SPAWN', 'No declared ports active'));
  };
  SpawnBid.prototype.onCheckPostSpawnFailed = function (reason) {
    this.spawnbid.reject(new lib.Error('UNSUCCESSFUL_SERVICE_SPAWN', 'No declared ports active'));
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
    var needinstname, spawnbid, modulename;
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
    modulename = need.modulename.indexOf(':')>0 ? need.modulename.split(':')[1] : need.modulename;
    if(!registry.getClientSide(modulename)){
      var ret = registry.registerClientSide(modulename).then(
        this.onBiddableModuleChecked.bind(this, need),
        function () {return false;}
      );
      need = null;
      return ret;
    }
    return this.onBiddableModuleChecked(need);
  }
  RemoteServiceNeedingServiceConsumer.prototype.onBiddableModuleChecked = function (need, moduleinst_ignored) {
    var spawnbid;
    var needinstname = need.instancename;
    var spawnedforinstname = this.spawnedServiceForName(needinstname);
    if (spawnedforinstname) {
      spawnbid = this.spawnbids.get(needinstname);
      if (!spawnbid) {
        this.spawnbids.add(needinstname, new SpawnBid());
        return true;
      }
      return spawnbid.waitingForSpawn();
    }
    var ret = (new portjobslib.Repeatable(
      portjobslib.spawnDescriptorToPorts(need),
      portjobslib.AllFree,
      10,
      lib.intervals.Second,
      function(allfree) {return allfree;}
    )).go().then(
      this.onBiddablePortCheck.bind(this,needinstname),
      function () {return false;}
    );
    needinstname = null;
    return ret;
  };
  RemoteServiceNeedingServiceConsumer.prototype.onBiddablePortCheck = function (needinstname, isok) {
    if (!this.spawnbids) {
      return false;
    }
    if (isok) {
      if (this.spawnbids.get(needinstname)) {
        this.log('need is not biddable, have a spawnbid named', needinstname);
        return false;
      }
      this.spawnbids.add(needinstname, new SpawnBid());
    }
    return isok;
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
  RemoteServiceNeedingServiceConsumer.prototype.spawnedServiceForName = function (instancename) {
    var servobj = {service:null};
    this.services.some(servfinderbyinstancename.bind(null, servobj, instancename));
    var ret = servobj.service;
    servobj = null;
    instancename = null;
    return ret;
  };
  RemoteServiceNeedingServiceConsumer.prototype.compulsoryConstructionProperties = ['sink','myIP','servicesTable','spawner','newServiceEvent'];
  return RemoteServiceNeedingServiceConsumer;
}

module.exports = createConsumeRemoteServiceNeedingService;
