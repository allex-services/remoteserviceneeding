module.exports = {
  record:{
    primaryKey: 'instancename',
    fields:[{
      name: 'instancename'
    },{
      name: 'modulename'
    },{
      name: 'propertyhash',
      default: {}
    },{
      name: 'strategies',
      default: {}
    },{
      name: 'closed',
    },{
      name: 'ipaddress'
    },{
      name: 'tcpport'
    },{
      name: 'httpport'
    },{
      name: 'wsport'
    },{
      name: 'pid'
    },{
      name: 'debug'
    },{
      name: 'debug_brk'
    },{
      name: 'prof'
    },{
      name: 'timeout',
      default: 60
    }]
  }
};
