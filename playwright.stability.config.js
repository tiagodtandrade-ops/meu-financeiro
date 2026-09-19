import base from "./playwright.config.js";
export default {
  ...base,
  grep: /migration com duplicatas|transferência inválida e conta arquivada|Escape é bloqueado|ao remover o botão/,
  repeatEach: 10,
  retries: 0,
  outputDir: "evidence/repeated-artifacts",
  reporter: [
    ["list"],
    ["json", { outputFile: "evidence/repeated-results.json" }],
  ],
  use: { ...base.use, trace: "on" },
};
