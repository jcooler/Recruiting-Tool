module.exports = {
  async rewrites() {
    console.log("Rewrites function called");
    return [
      // Proxy API requests
      {
        source: '/api/:path*',
        destination: 'https://recruiting-tool-api.vercel.app/api/:path*',
      },
    ]
  },
}