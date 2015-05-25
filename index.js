function createServicePack(execlib){
  var execSuite = execlib.execSuite,
      NeedingServicePack = execSuite.registry.register('allex_needingservice'),
      ParentServicePack = NeedingServicePack;

  return {
    Service: require('./servicecreator')(execlib,ParentServicePack),
    SinkMap: require('./sinkmapcreator')(execlib,ParentServicePack),
    Tasks: [{
      name: 'consumeRemoteServiceNeedingService',
      klass: require('./tasks/consumeremoteserviceneedingservice')(execlib)
    }]
  };
}

module.exports = createServicePack;
