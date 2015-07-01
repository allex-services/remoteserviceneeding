function createServicePack(execlib){
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    d = q.defer(),
    execSuite = execlib.execSuite;

  execSuite.registry.register('allex_needingservice').done(
    realCreator.bind(null, d),
    d.reject.bind(d)
  );

  function realCreator(defer, ParentServicePack){
    defer.resolve({
      Service: require('./servicecreator')(execlib,ParentServicePack),
      SinkMap: require('./sinkmapcreator')(execlib,ParentServicePack),
      Tasks: [{
        name: 'consumeRemoteServiceNeedingService',
        klass: require('./tasks/consumeremoteserviceneedingservice')(execlib)
      }]
    });
  };

  return d.promise;
}

module.exports = createServicePack;
