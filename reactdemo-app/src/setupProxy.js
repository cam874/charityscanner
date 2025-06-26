const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://170.64.168.145:3000', // Proxy to VPS API
      changeOrigin: true,
      secure: false, // Not needed for HTTP, but harmless
      onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying request: ${req.method} ${req.url}`);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(`Received response for: ${req.method} ${req.url} - Status: ${proxyRes.statusCode}`);
      },
      onError: (err, req, res) => {
        console.error(`Proxy error for: ${req.method} ${req.url} - Error: ${err.message}`);
      },
    })
  );
};
