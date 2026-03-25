// server/api/check-config.get.ts
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  return {
    hasAnthropicKey: !!(
      config.anthropicApiKey && config.anthropicApiKey.length > 20
    ),
  };
});
