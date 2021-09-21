function createTasks(execlib, portjobslib) {
  'use strict';
  return [{
    name: 'consumeRemoteServiceNeedingService',
    klass: require('./tasks/consumeremoteserviceneedingservice')(execlib, portjobslib)
  }];
};

module.exports = createTasks;
     
