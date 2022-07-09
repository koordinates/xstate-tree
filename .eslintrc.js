module.exports = {
  parserOptions: { 
    tsconfigRootDir: __dirname,
    ecmaFeatures: {
      jsx: true,
    },
  },
  overrides: [
    {
      files: ["*.tsx", "*.ts", "*.js", "*.jsx"],
      extends: [ "@rushstack/eslint-config/profile/web-app", "plugin:react-hooks/recommended", "@rushstack/eslint-config/mixins/react"],
      plugins: ["import", "prettier"],
      rules: {
        "@rushstack/typedef-var": "off",
        "@typescript-eslint/typedef": "off",
        "@typescript-eslint/consistent-type-definitions": "off",
        "no-void": "off",
        "promise/param-names": "off",
        "import/no-unresolved": "off",
        "import/named": "off",
        "prettier/prettier": "error",
        "import/default": "error",
        "import/no-self-import": "error",
        "import/export": "error",
        "import/no-named-as-default": "error",
        "import/no-named-as-default-member": "error",
        "import/no-deprecated": "warn",
        "import/no-mutable-exports": "error",
        "import/first": "error",
        "no-unused-expressions": "off",
        "react/jsx-no-bind": "off",
        "import/order": [
          "error",
          {
            "newlines-between": "always",
            "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
            "pathGroups": [
              {
                "pattern": "~**/**",
                "group": "internal"
              },
              {
                "pattern": "~*",
                "group": "internal"
              },
            ],
            "alphabetize": {
              "order": "asc"
            }
          }
        ],
        "import/newline-after-import": "error",
        "@typescript-eslint/explicit-member-accessibility": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/prefer-interface": "off",
        "@typescript-eslint/no-angle-bracket-type-assertion": "off",
        "@typescript-eslint/camelcase": "off",
        "@typescript-eslint/no-unused-vars": [
          "error",
          { "varsIgnorePattern": "^_", "argsIgnorePattern": "^_" }
        ],
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/ban-ts-comment": ["error", {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": "allow-with-description",
          "ts-nocheck": "allow-with-description"
        }],
        "@typescript-eslint/naming-convention": [
         "error",
           {
             "selector": "interface",
             "format": ["PascalCase"],
           }
         ]
      },
      "settings": {
       "import/extensions": [".ts", ".tsx"],
       "import/ignore": ["node_modules"],
       "import/internal-regex": "^@kx/",
       "import/resolver": "typescript",
       "import/external-module-folders": ["node_modules", "node_modules/@types"]
      },
    },
    {
      "files": ["*.spec.ts", "*.spec.tsx"],                                                                                                                                                                                                                                                                              
      "rules": {                                                                                                                                                                                                                                                                                                         
       "@typescript-eslint/ban-ts-comment": "off",                                                                                                                                                                                                                                                                      
       "@typescript-eslint/no-var-requires ": "off",                                                                                                                                                                                                                                                                    
       "@typescript-eslint/no-non-null-assertion": "off",
       "@typescript-eslint/no-explicit-any": "off",
       "@typescript-eslint/no-floating-promises": "off",
      }
    },
  ]
}