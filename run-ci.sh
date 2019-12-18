#!/bin/bash
set -ev

npm run test
npm run lint
npx nyc report

if [ "${CI}" = "true" ]; then
	npx nyc report --reporter=text-lcov | npx coveralls
fi
