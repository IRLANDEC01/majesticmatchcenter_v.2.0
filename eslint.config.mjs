import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Блокируем случайный импорт use-debounce после миграции на TanStack Pacer
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['use-debounce*'],
              message: 'use-debounce заменен на TanStack Pacer. Используйте usePacerDebounce из @/shared/hooks',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
