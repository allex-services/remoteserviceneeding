function createServicePack(execlib){
  'use strict';
  return {
    service: {
      dependencies: ['allex_needingservice']
    },
    sinkmap: {
      dependencies: ['allex_needingservice']
    },
    tasks: {
      dependencies: ['allex:porthandlingjobs:lib']
    }
  };
}

module.exports = createServicePack;
