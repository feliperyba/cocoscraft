/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
    root: true,
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
    ],
    plugins: ['simple-import-sort', 'import', '@typescript-eslint', 'prettier'],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest", // Allows the use of modern ECMAScript features
        sourceType: "module", // Allows for the use of imports
    },
    ignorePatterns: ['.eslintrc.cjs', '*.spec.ts', '*.config.[jt]s', '*.js', '*.mjs', 'node_modules/**/*'],
    rules: {
        'no-useless-catch': 'off',
        'prettier/prettier': ['error', { endOfLine: 'auto' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/consistent-type-assertions': 'warn',
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/naming-convention': [
            'warn',
            {
                selector: 'default',
                format: ['camelCase'],
                filter: {
                    // remove check from quoting props like 'Access-Control-Allow-Origin'
                    regex: '[-]',
                    match: false,
                },
            },
            {
                selector: 'import',
                format: ['camelCase', 'PascalCase'],
            },
            {
                selector: 'variable',
                format: ['camelCase', 'UPPER_CASE'],
            },
            {
                selector: 'typeLike',
                format: ['PascalCase'],
            },
            {
                selector: 'enumMember',
                format: ['PascalCase'],
            },
            {
                selector: 'parameter',
                format: ['camelCase'],
                leadingUnderscore: 'allow',
            },
        ],
        '@typescript-eslint/no-unused-expressions': 'warn',
        '@typescript-eslint/no-misused-new': 'warn',
        '@typescript-eslint/no-var-requires': 'warn',
        '@typescript-eslint/no-empty-interface': 'warn',
        '@typescript-eslint/no-namespace': 'warn',
        '@typescript-eslint/no-non-null-assertion': 'warn',
        '@typescript-eslint/no-shadow': ['warn'],
        '@typescript-eslint/no-magic-numbers': [
            'warn',
            {
                ignoreNumericLiteralTypes: true,
                ignoreEnums: true,
                ignoreReadonlyClassProperties: true,
                ignoreDefaultValues: true,
                ignore: [0, 1, -1, 180, 90, 45, 30, 60, 1000, 100, -180, -90, -45,  -30, -60, -1000, -100],
            },
        ],
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error'],
        semi: 'off',
        '@typescript-eslint/semi': ['error'],
        'no-extra-semi': 'off',
        '@typescript-eslint/no-extra-semi': ['error'],
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        complexity: ['warn', { max: 10 }],
    },
    overrides: [
        {
            files: ['**/?(*.)spec.ts'],
            rules: {
                '@typescript-eslint/no-magic-numbers': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off',
            },
        },
    ],
    env: {
        node: true
    },
};
