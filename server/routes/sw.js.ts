export default defineEventHandler(() => {
  return new Response("// service worker placeholder", {
    headers: { "Content-Type": "application/javascript" },
  })
})
