import Server from "../../src/api/Server";
import DiscordClient from "../../src/client/Client";
import { jest, beforeEach, describe, test, expect } from '@jest/globals';
import request from 'supertest';

jest.mock('../../src/client/Client');

beforeEach(() => {
    (DiscordClient as unknown as jest.Mock).mockClear();
});

describe("API server", () => {
    const client = new DiscordClient({
        intents: []
    });

    const server = new Server(client);
    
    test('check if server works', () => {
        request(server.express)
            .get('/')
            .expect(200)
            .end((err, res) => {
                if (err) {
                    throw err;
                }

                expect(res?.body?.message).toBe('Server is up.');
            });
    });
});