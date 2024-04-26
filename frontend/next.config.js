module.exports = {
  async rewrites() {
    console.log("Rewrites function called");
    return [
      // Proxy API requests
      {
        source: '/api/:path*',
        destination: 'http://localhost:5001/api/:path*',
      },
    ]
  },
}
