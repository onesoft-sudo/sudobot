"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Server_1 = __importDefault(require("../../src/api/Server"));
const Client_1 = __importDefault(require("../../src/client/Client"));
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
globals_1.jest.mock('../../src/client/Client');
(0, globals_1.beforeEach)(() => {
    Client_1.default.mockClear();
});
(0, globals_1.describe)("API server", () => {
    const client = new Client_1.default({
        intents: []
    });
    const server = new Server_1.default(client);
    (0, globals_1.test)('check if server works', () => {
        (0, supertest_1.default)(server.express)
            .get('/')
            .expect(200)
            .end((err, res) => {
            var _a;
            if (err) {
                throw err;
            }
            (0, globals_1.expect)((_a = res === null || res === void 0 ? void 0 : res.body) === null || _a === void 0 ? void 0 : _a.message).toBe('Server is up.');
        });
    });
});
