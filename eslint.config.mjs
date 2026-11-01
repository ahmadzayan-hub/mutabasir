import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Arrived as an error via the Next 16 eslint-config-next bump, not an
      // opt-in. Every current hit is a legitimate effect (localStorage
      // hydration, a setInterval timer, re-validating a selection against
      // new data) rather than a derivable-at-render value. Revisit as a
      // deliberate lint-adoption pass, not a side effect of a security PR.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
