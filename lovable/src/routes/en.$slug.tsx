import { createFileRoute } from "@tanstack/react-router";
import { html, redirect } from "../lib/html-headers";
import stima from "../../public/pwa/en/stima.html?raw";
import risultati from "../../public/pwa/en/risultati.html?raw";
import ottimizzazione from "../../public/pwa/en/ottimizzazione.html?raw";
import checklist from "../../public/pwa/en/checklist-dsu.html?raw";
import diritti from "../../public/pwa/en/diritti-pa.html?raw";
import fonti from "../../public/pwa/en/fonti.html?raw";
import metodo from "../../public/pwa/en/metodo.html?raw";
import contatti from "../../public/pwa/en/contatti.html?raw";
import privacy from "../../public/pwa/en/privacy.html?raw";
import notFound from "../../public/pwa/en/404.html?raw";

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
};

export const Route = createFileRoute("/en/$slug")({
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
