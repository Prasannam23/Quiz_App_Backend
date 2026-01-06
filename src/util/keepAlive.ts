/**
 * Keep-Alive Script for Render Free Tier
 * Prevents the server from spinning down due to inactivity
 * Pings the health endpoint every 14 minutes
 */

export const startKeepAlive = () => {
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8000}`;
  const healthEndpoint = `${backendUrl}/api/health`;
  const intervalMs = 14 * 60 * 1000; // 14 minutes in milliseconds

  console.log(`⏰ Keep-Alive started. Will ping ${healthEndpoint} every 14 minutes`);

  setInterval(async () => {
    try {
      const response = await fetch(healthEndpoint, {
        method: 'GET',
        timeout: 10000, // 10 second timeout
      });

      if (response.ok) {
        console.log(`✅ Keep-Alive ping successful at ${new Date().toISOString()}`);
      } else {
        console.warn(`⚠️ Keep-Alive ping returned status ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Keep-Alive ping failed:`, error);
    }
  }, intervalMs);
};
