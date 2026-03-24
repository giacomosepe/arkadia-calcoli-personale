export default defineNuxtRouteMiddleware((to) => {
  const { userId } = useAuth()

  // Protect all /app/* routes
  if (to.path.startsWith('/app') && !userId.value) {
    return navigateTo('/')
  }
})
