module.exports = {
    title: 'Mockable Express Process Status',
    theme: 'default.css',
    path: '/exstatus66286721564023',
    socketPath: '/socket.io',
    spans: [
      {
        interval: 1,
        retention: 60,
      },
      {
        interval: 5,
        retention: 60,
      },
      {
        interval: 15,
        retention: 60,
      },
      {
        interval: 30,
        retention: 60,
      },
      {
        interval: 60,
        retention: 60,
      },
      {
        interval: 300,
        retention: 60,
      },
    ],
    port: null,
    websocket: null,
    iframe: true,
    chartVisibility: {
      cpu: true,
      mem: true,
      load: true,
      responseTime: true,
      rps: true,
      statusCodes: true,
    },
    ignoreStartsWith: '/admin',
    healthChecks: []
  };
  