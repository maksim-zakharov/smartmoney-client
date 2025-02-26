import { defaults } from 'jest-config';

export default {
    "reporters": [
        "default",
        [
            "jest-junit",
            {
                "outputDirectory": "reports"
            }
        ],
        [
            "jest-allure",
            {
                "resultsDir": "./allure-results",
                "environmentInfo": {
                    "NODE_VERSION": process.version,
                    "OS": process.platform
                }
            }
        ]
    ],
    "preset": "ts-jest",
    "globals": {
        "ts-jest": {
            "diagnostics": false
        }
    },
    "setupFilesAfterEnv": ["jest-allure/dist/setup"],
    moduleFileExtensions: [...defaults.moduleFileExtensions, "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
        "^.+\\.(ts)$": "ts-jest"
    },
    "testPathIgnorePatterns": [
        "/node_modules/",
        "/dist/"
    ],
    "collectCoverageFrom": [
        "**/*.(t|j)s"
    ],
    "coverageDirectory": "../coverage",
    testEnvironment: "jest-jasmine2",
}