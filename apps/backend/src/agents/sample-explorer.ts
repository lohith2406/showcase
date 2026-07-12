import type { DiscoveredPage } from "@showcase/contracts";
import type { ExplorerAgent, InternalProjectRecord } from "../domain.js";

const font = "font-family='Segoe UI, Arial, sans-serif'";

// A light, premium SaaS mockup that matches the studio's wayfinding palette.
// The cobalt primary action sits where the sample hotspot lands (top-right).
const svg = (title: string, subtitle: string, action: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900" ${font}>` +
      `<rect width="1440" height="900" fill="#f1f0ec"/>` +
      // sidebar
      `<rect width="248" height="900" fill="#ffffff"/>` +
      `<rect x="247" width="1" height="900" fill="#dcdee3"/>` +
      `<circle cx="42" cy="46" r="8" fill="none" stroke="#1a1918" stroke-width="3"/>` +
      `<circle cx="52" cy="60" r="4" fill="#d8890a"/>` +
      `<text x="70" y="53" fill="#14161b" font-size="18" font-weight="600">showcase.ai</text>` +
      [0, 1, 2, 3, 4]
        .map((row) =>
          row === 0
            ? `<rect x="16" y="112" width="216" height="44" rx="10" fill="#efece4"/><rect x="16" y="112" width="3" height="44" fill="#1a1918"/><rect x="40" y="128" width="120" height="12" rx="6" fill="#1a1918"/>`
            : `<rect x="40" y="${128 + row * 56}" width="${150 - row * 14}" height="12" rx="6" fill="#c4c8d0"/>`,
        )
        .join("") +
      // top bar
      `<rect x="248" width="1192" height="96" fill="#ffffff"/>` +
      `<rect x="248" y="95" width="1192" height="1" fill="#dcdee3"/>` +
      `<text x="288" y="52" fill="#14161b" font-size="30" font-weight="600">${title}</text>` +
      `<text x="288" y="78" fill="#565c66" font-size="17">${subtitle}</text>` +
      // primary action (aligns with hotspot at x:0.78,y:0.1)
      `<rect x="1136" y="28" width="272" height="48" rx="11" fill="#1a1918"/>` +
      `<text x="1272" y="58" fill="#ffffff" font-size="17" font-weight="600" text-anchor="middle">${action}</text>` +
      // stat cards
      [0, 1, 2]
        .map(
          (col) =>
            `<rect x="${288 + col * 372}" y="132" width="348" height="150" rx="16" fill="#ffffff" stroke="#dcdee3"/>` +
            `<rect x="${312 + col * 372}" y="160" width="90" height="12" rx="6" fill="#c4c8d0"/>` +
            `<text x="${312 + col * 372}" y="228" fill="#14161b" font-size="40" font-weight="620">${["2.4k", "38", "97%"][col]}</text>`,
        )
        .join("") +
      // main panel: a calm data table
      `<rect x="288" y="308" width="1120" height="512" rx="16" fill="#ffffff" stroke="#dcdee3"/>` +
      `<rect x="320" y="340" width="150" height="14" rx="7" fill="#14161b"/>` +
      `<rect x="320" y="388" width="80" height="9" rx="4.5" fill="#b0b6bf"/>` +
      `<rect x="756" y="388" width="80" height="9" rx="4.5" fill="#b0b6bf"/>` +
      `<rect x="1256" y="388" width="70" height="9" rx="4.5" fill="#b0b6bf"/>` +
      `<rect x="320" y="410" width="1056" height="1" fill="#e6e8ec"/>` +
      [0, 1, 2, 3, 4, 5]
        .map((row) => {
          const y = 432 + row * 62;
          return (
            `<circle cx="336" cy="${y + 14}" r="16" fill="#eef0f2"/>` +
            `<rect x="368" y="${y + 4}" width="${170 + (row % 3) * 44}" height="12" rx="6" fill="#c8ccd3"/>` +
            `<rect x="368" y="${y + 24}" width="${100 + (row % 2) * 40}" height="9" rx="4.5" fill="#dfe1e6"/>` +
            `<rect x="756" y="${y + 12}" width="130" height="12" rx="6" fill="#d3d6dc"/>` +
            `<rect x="1256" y="${y + 4}" width="120" height="28" rx="14" fill="#f0f1f4" stroke="#e2e4e8"/>` +
            `<circle cx="1278" cy="${y + 18}" r="5" fill="#b7bcc4"/>` +
            (row < 5
              ? `<rect x="320" y="${y + 46}" width="1056" height="1" fill="#eef0f1"/>`
              : "")
          );
        })
        .join("") +
      `</svg>`,
  )}`;

export class SampleExplorerAgent implements ExplorerAgent {
  async explore(project: InternalProjectRecord): Promise<DiscoveredPage[]> {
    const sections = [
      [
        "dashboard",
        "Dashboard",
        "Monitor product adoption and recent activity",
      ],
      ["projects", "Projects", "Create and manage customer-facing demos"],
      ["team", "Team management", "Invite collaborators and manage access"],
    ] as const;
    const actions = [
      "View product activity",
      "Create a demo",
      "Invite a teammate",
    ] as const;
    return sections.map(([path, title, summary], index) => {
      const action = actions[index] ?? actions[0];
      return {
        id: `${project.id}-sample-${path}`,
        url: `${project.origin}/${path}`,
        title,
        navigationLabel: title,
        summary,
        screenshotUrl: svg(title, summary, action),
        elements: [
          {
            id: `${project.id}-sample-${path}-primary`,
            role: "button",
            name: action,
            text: action,
            selector: `[data-showcase-sample="${path}-primary"]`,
            rect: { x: 0.78, y: 0.1, width: 0.15, height: 0.06 },
            importance: 0.98,
            safeToClick: true,
          },
        ],
      };
    });
  }
}
