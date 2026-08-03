import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/home";

export const Route = createFileRoute("/")({
  component: Home,
  ssr: false,
  head: () => ({
    meta: [
      { title: "MachinistPro — Engineering Calculator Suite" },
      {
        name: "description",
        content:
          "Premium engineering calculator suite for machinists, CNC operators, fabrication shops, mechanical engineers, and students.",
      },
      { property: "og:title", content: "MachinistPro — Engineering Calculator Suite" },
      {
        property: "og:description",
        content:
          "Premium engineering calculator suite for machinists, CNC operators, fabrication shops, mechanical engineers, and students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
