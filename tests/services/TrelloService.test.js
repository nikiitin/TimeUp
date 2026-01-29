/**
 * Tests for TrelloService.js
 */

import { jest } from "@jest/globals";
import { createTrelloMock, createErrorMock } from "../mocks/trelloMock.js";
import TrelloService from "../../src/services/TrelloService.js";

describe("TrelloService", () => {
  let mockT;

  beforeEach(() => {
    mockT = createTrelloMock();
    jest.clearAllMocks();
  });

  describe("getCard", () => {
    test("returns card data", async () => {
      const result = await TrelloService.getCard(mockT);

      expect(result).toEqual({
        id: "test-card-id",
        name: "Test Card",
        url: "https://trello.com/c/test",
      });
    });

    test("returns null on error", async () => {
      mockT.card = createErrorMock("Card not found");

      const result = await TrelloService.getCard(mockT);
      expect(result).toBeNull();
    });
  });

  describe("getBoard", () => {
    test("returns board data", async () => {
      const result = await TrelloService.getBoard(mockT);

      expect(result).toEqual({
        id: "test-board-id",
        name: "Test Board",
        url: "https://trello.com/b/test",
      });
    });

    test("returns null on error", async () => {
      mockT.board = createErrorMock("Board not found");

      const result = await TrelloService.getBoard(mockT);
      expect(result).toBeNull();
    });
  });

  describe("getMember", () => {
    test("returns member data", async () => {
      const result = await TrelloService.getMember(mockT);

      expect(result).toEqual({
        id: "test-member-id",
        fullName: "Test User",
        username: "testuser",
      });
    });

    test("returns null on error", async () => {
      mockT.member = createErrorMock("Member not found");

      const result = await TrelloService.getMember(mockT);
      expect(result).toBeNull();
    });
  });

  describe("closePopup", () => {
    test("calls closePopup on Trello client", async () => {
      await TrelloService.closePopup(mockT);
      expect(mockT.closePopup).toHaveBeenCalled();
    });

    test("handles errors gracefully", async () => {
      mockT.closePopup = createErrorMock("Popup error");

      // Should not throw
      await expect(TrelloService.closePopup(mockT)).resolves.not.toThrow();
    });
  });
});
