import {defaults} from 'jest-config';
import os from "node:os";

export default {
    "reporters": [
        "default",
        [
            "jest-junit",
            {
                "outputDirectory": "reports"
            }
        ],
    ],
    "preset": "ts-jest",
    "globals": {
        "ts-jest": {
            "diagnostics": false
        }
    },
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
    testEnvironment: "allure-jest/node",
    testEnvironmentOptions: {
        resultsDir: "./allure-results",
        environmentInfo: {
            os_platform: os.platform(),
            os_release: os.release(),
            os_version: os.version(),
            node_version: process.version,
        },
    }
}