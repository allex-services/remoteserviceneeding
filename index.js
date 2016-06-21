function createServicePack(execlib){
  'use strict';
  return {
    service: {
      dependencies: ['allex:needing']
    },
    sinkmap: {
      dependencies: ['allex:needing']
    },
    tasks: {
      dependencies: []
    }
  };
}

module.exports = createServicePack;
