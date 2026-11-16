import { createFileRoute } from "@tanstack/react-router";
import { html, redirect } from "../lib/html-headers";
import stima from "../../public/pwa/stima.html?raw";
import risultati from "../../public/pwa/risultati.html?raw";
import ottimizzazione from "../../public/pwa/ottimizzazione.html?raw";
import checklist from "../../public/pwa/checklist-dsu.html?raw";
import diritti from "../../public/pwa/diritti-pa.html?raw";
import fonti from "../../public/pwa/fonti.html?raw";
import metodo from "../../public/pwa/metodo.html?raw";
import contatti from "../../public/pwa/contatti.html?raw";
import privacy from "../../public/pwa/privacy.html?raw";
import auu from "../../public/pwa/isee-assegno-unico.html?raw";
import notFound from "../../public/404.html?raw";

const PAGES: Record<string, string> = {
  stima,
  risultati,
  ottimizzazione,
  "checklist-dsu": checklist,
  "diritti-pa": diritti,
  fonti,
  metodo,
  contatti,
  privacy,
  "isee-assegno-unico": auu,
};

/** Deep link: /contatti ecc. restituiscono l'HTML proprio, 200. /stima/ → 301 /stima. */
export const Route = createFileRoute("/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
          return redirect(url.pathname.replace(/\/+$/, "") + url.search);
        }
        const body = PAGES[params.slug];
        if (!body) return html(notFound, 404);
        return html(body, 200);
      },
    },
  },
  component: () => null,
});
