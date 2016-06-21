function createTasks(execlib) {
  'use strict';
  return [{
    name: 'consumeRemoteServiceNeedingService',
    klass: require('./tasks/consumeremoteserviceneedingservice')(execlib)
  }];
};

module.exports = createTasks;
     
