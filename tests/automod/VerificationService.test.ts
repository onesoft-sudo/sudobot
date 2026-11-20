import VerificationService from "@main/automod/VerificationService";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@main/utils/axios", () => ({
    getAxiosClient: () => ({ get })
}));

describe("VerificationService.isProxy with VPNDetection", () => {
    const service = Object.assign(Object.create(VerificationService.prototype), {
        logger: { debug: vi.fn() }
    }) as VerificationService;
    const config = { vpn_proxy_check_enabled: true, vpn_proxy_check_provider: "vpndetection" as const };

    beforeEach(() => {
        get.mockReset();
    });

    it("flags a VPN address", async () => {
        get.mockResolvedValue({ status: 200, data: { ip: "185.159.157.10", is_vpn: true, is_tor: false, is_relay: false } });
        expect(await service.isProxy("185.159.157.10", config)).toBe(true);
        expect(get.mock.calls[0]?.[0]).toBe("https://api.vpndetection.io/185.159.157.10");
    });

    it("flags a Tor exit", async () => {
        get.mockResolvedValue({ status: 200, data: { ip: "185.220.101.1", is_vpn: false, is_tor: true, is_relay: false } });
        expect(await service.isProxy("185.220.101.1", config)).toBe(true);
    });

    it("flags a residential proxy when a paid key returns the field", async () => {
        get.mockResolvedValue({
            status: 200,
            data: { ip: "203.0.113.5", is_vpn: false, is_tor: false, is_relay: false, is_resproxy: true }
        });
        expect(await service.isProxy("203.0.113.5", config)).toBe(true);
    });

    it("lets a clean address and a privacy relay through", async () => {
        get.mockResolvedValue({ status: 200, data: { ip: "8.8.8.8", is_vpn: false, is_tor: false, is_relay: false } });
        expect(await service.isProxy("8.8.8.8", config)).toBe(false);
        get.mockResolvedValue({ status: 200, data: { ip: "172.224.226.10", is_vpn: false, is_tor: false, is_relay: true } });
        expect(await service.isProxy("172.224.226.10", config)).toBe(false);
    });

    it("treats an error answer as a proxy, as the proxycheck path does", async () => {
        get.mockResolvedValue({ status: 400, data: { error: "invalid IP address" } });
        expect(await service.isProxy("not-an-ip", config)).toBe(true);
    });

    it("does nothing when the check is off", async () => {
        expect(await service.isProxy("185.159.157.10", { ...config, vpn_proxy_check_enabled: false })).toBe(false);
        expect(get).not.toHaveBeenCalled();
    });
});
