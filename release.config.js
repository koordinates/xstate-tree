const base = require("semantic-release-npm-github-publish");

module.exports = {
  ...base,
  releaseRules: [],
  plugins: [
    ...base.plugins.slice(1),
   [
     "@saithodev/semantic-release-backmerge",
     {
       "branches": [{"from": "master", "to": "beta"}]
     }
   ]
  ]
}