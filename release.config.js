const base = require("semantic-release-npm-github-publish");

module.exports = {
  ...base,
  releaseRules: [],
  plugins: [
    ...base.plugins,
   [
     "@saithodev/semantic-release-backmerge",
     {
       "branches": [{"from": "master", "to": "beta"}]
     }
   ]
  ]
}