// .eslintrc.js

module.exports = {
  "extends": "airbnb",
  "plugins": [],
  "rules": {
    "jsx-a11y/href-no-hash": [0],
    "no-plusplus": ["error", { "allowForLoopAfterthoughts": true }],
    "no-use-before-define": ["error", { "functions": false, "classes": true }],
    camelcase: [1, {properties: "never"}],
    "arrow-body-style": [1, "always"],
    "consistent-return": 1,
    "max-len": [1, { "ignoreComments": true, "ignoreTrailingComments": true, code: 100, "ignoreStrings": true, "ignoreUrls": true, "ignoreTemplateLiterals": true }],
    "no-param-reassign": [1, { "props": false }],
    "strict": 0,
    "max-lines-per-function": [1, 20],
    "no-use-before-define": 0,
    "padded-blocks": 0,
    "class-methods-use-this": 0,
    "no-param-reassign": 0
  },
  "globals": {
    "angular": true
  }
};
