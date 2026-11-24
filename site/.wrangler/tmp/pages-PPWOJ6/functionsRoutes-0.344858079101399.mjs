import { onRequestGet as __api_blackfin_live_js_onRequestGet } from "/Users/sachin/parvislabs-lanes/v2/site/functions/api/blackfin-live.js"
import { onRequestPost as __api_blackfin_live_js_onRequestPost } from "/Users/sachin/parvislabs-lanes/v2/site/functions/api/blackfin-live.js"

export const routes = [
    {
      routePath: "/api/blackfin-live",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_blackfin_live_js_onRequestGet],
    },
  {
      routePath: "/api/blackfin-live",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_blackfin_live_js_onRequestPost],
    },
  ]