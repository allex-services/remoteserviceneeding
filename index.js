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
      dependencies: []
    }
  };
}

module.exports = createServicePack;
