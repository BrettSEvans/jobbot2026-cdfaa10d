import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRevisionCrud } from "../revisionFactory";

// Mock supabase client
const mockFrom = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

/** Build a chainable query mock that resolves to the given result */
function chainMock(result: { data: any; error: any }) {
  const chain: any = {};
  const methods = ["select", "insert", "delete", "eq", "order", "limit", "single"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // The terminal call (single/select at end) resolves
  chain.single = vi.fn().mockResolvedValue(result);
  // For getAll: order returns { data, error } directly via the chain
  // We need select to return the chain, eq to return, order to resolve
  chain.order = vi.fn().mockReturnValue(chain);
  // Make the chain itself thenable for getAll (which doesn't call .single)
  chain.then = (resolve: any) => Promise.resolve(result).then(resolve);
  return chain;
}

describe("createRevisionCrud", () => {
  const crud = createRevisionCrud("test_revisions", "html");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("save", () => {
    it("gets latest revision number and inserts next", async () => {
      // First call: get latest revision_number
      const latestChain = chainMock({ data: { revision_number: 3 }, error: null });
      // Second call: insert new revision
      const insertChain = chainMock({
        data: { id: "new-id", application_id: "app-1", revision_number: 4, label: "Test", html: "<html>" },
        error: null,
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? latestChain : insertChain;
      });

      const result = await crud.save("app-1", "<html>", "Test");

      expect(mockFrom).toHaveBeenCalledWith("test_revisions");
      expect(result.revision_number).toBe(4);
      expect(insertChain.insert).toHaveBeenCalledWith({
        application_id: "app-1",
        html: "<html>",
        label: "Test",
        revision_number: 4,
      });
    });

    it("starts at revision 1 when no previous revisions exist", async () => {
      const latestChain = chainMock({ data: null, error: null });
      const insertChain = chainMock({
        data: { id: "id-1", application_id: "app-1", revision_number: 1, label: "Revision 1", html: "<p>" },
        error: null,
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? latestChain : insertChain;
      });

      const result = await crud.save("app-1", "<p>");
      expect(result.revision_number).toBe(1);
      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ revision_number: 1, label: "Revision 1" })
      );
    });

    it("throws on insert error", async () => {
      const latestChain = chainMock({ data: null, error: null });
      const insertChain = chainMock({ data: null, error: { message: "DB error" } });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? latestChain : insertChain;
      });

      await expect(crud.save("app-1", "x")).rejects.toThrow("DB error");
    });
  });

  describe("getAll", () => {
    it("returns revisions ordered descending", async () => {
      const revisions = [
        { id: "2", revision_number: 2 },
        { id: "1", revision_number: 1 },
      ];
      const chain = chainMock({ data: revisions, error: null });
      // For getAll, we need to make the chain resolve without .single
      // Override: order returns a promise-like with data
      chain.order = vi.fn().mockResolvedValue({ data: revisions, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await crud.getAll("app-1");
      expect(result).toHaveLength(2);
      expect(chain.eq).toHaveBeenCalledWith("application_id", "app-1");
      expect(chain.order).toHaveBeenCalledWith("revision_number", { ascending: false });
    });

    it("returns empty array when no revisions", async () => {
      const chain = chainMock({ data: null, error: null });
      chain.order = vi.fn().mockResolvedValue({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await crud.getAll("app-1");
      expect(result).toEqual([]);
    });

    it("throws on query error", async () => {
      const chain = chainMock({ data: null, error: { message: "Network error" } });
      chain.order = vi.fn().mockResolvedValue({ data: null, error: { message: "Network error" } });
      mockFrom.mockReturnValue(chain);

      await expect(crud.getAll("app-1")).rejects.toThrow("Network error");
    });
  });

  describe("remove", () => {
    it("deletes by id", async () => {
      const chain = chainMock({ data: null, error: null });
      // delete doesn't call .single, it resolves from .eq
      chain.eq = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue(chain);

      await crud.remove("rev-id");
      expect(mockFrom).toHaveBeenCalledWith("test_revisions");
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith("id", "rev-id");
    });

    it("throws on delete error", async () => {
      const chain = chainMock({ data: null, error: null });
      chain.eq = vi.fn().mockResolvedValue({ error: { message: "Not found" } });
      mockFrom.mockReturnValue(chain);

      await expect(crud.remove("bad-id")).rejects.toThrow("Not found");
    });
  });
});
