import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Prohibit native confirm/alert/prompt - use ConfirmationDialog instead
      "no-restricted-globals": [
        "error",
        {
          name: "confirm",
          message: "Use ConfirmationDialog component instead of native confirm(). See docs/SKELETON_GUIDE.md for usage.",
        },
        {
          name: "alert",
          message: "Use toast notifications instead of native alert(). Import from @/hooks/use-toast.",
        },
        {
          name: "prompt",
          message: "Use Dialog component with form inputs instead of native prompt().",
        },
      ],
      // Prohibit type="date" and type="time" in Input components - use DatePicker/TimePicker instead
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='type'][value.value='date']",
          message: "Use DatePicker component instead of <Input type=\"date\" />. Import from @ui/date-picker.",
        },
        {
          selector: "JSXAttribute[name.name='type'][value.value='time']",
          message: "Use TimePicker component instead of <Input type=\"time\" />. Import from @ui/time-picker. For time ranges, use TimeRangePicker from @ui/time-range-picker.",
        },
      ],
    },
  },
];

export default eslintConfig;
