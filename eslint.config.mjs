// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',

      // Surgical ban on `import type` for files that NestJS needs at runtime:
      //   - DTOs: class-validator decorators must be readable by ValidationPipe.
      //   - Entities (TypeORM) and Schemas (Mongoose): decorators define columns.
      //   - Strategies / providers: DI tokens are the class itself.
      // A global ban can't be used because TS (isolatedModules +
      // emitDecoratorMetadata) requires `import type` for interfaces used in
      // decorated signatures (e.g. RequestWithUser).
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "ImportDeclaration[importKind='type'][source.value=/[\\\\/](dto|entities|schemas)[\\\\/]/]",
          message:
            "Don't use `import type` for DTOs / entities / schemas — NestJS needs the class at runtime for class-validator and TypeORM/Mongoose metadata. Use a value import: `import { Foo } from '...';`",
        },
        {
          selector:
            "ImportSpecifier[importKind='type']:matches([parent.source.value=/[\\\\/](dto|entities|schemas)[\\\\/]/])",
          message:
            "Don't use inline `{ type Foo }` for DTOs / entities / schemas — use a plain value import.",
        },
      ],

      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
);
