import { createFileRoute } from "@tanstack/react-router";
import { redirect } from "../lib/html-headers";

/** /index.html non deve restare nella barra: 301 verso /. L'hash lo conserva il browser. */
export const Route = createFileRoute("/index.html")({
  server: {
    handlers: {
      GET: async () => redirect("/"),
    },
  },
});
