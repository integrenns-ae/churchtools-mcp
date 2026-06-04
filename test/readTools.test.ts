import { describe, expect, it, vi } from "vitest";
import { readToolDefinitions, runReadTool } from "../src/tools/readTools.js";
import type { ChurchToolsRequest } from "../src/types.js";
import { testConfig } from "./helpers.js";

const sampleParams: Record<string, Record<string, unknown>> = {
  churchtools_whoami: {},
  churchtools_list_persons: { page: 1, limit: 20 },
  churchtools_get_person: { personId: 1 },
  churchtools_list_person_groups: { personId: 1 },
  churchtools_list_person_events: { personId: 1 },
  churchtools_list_groups: { page: 1, limit: 20 },
  churchtools_get_group: { groupId: 1 },
  churchtools_list_group_members: { groupId: 1, page: 1, limit: 20 },
  churchtools_list_events: { page: 1, limit: 20 },
  churchtools_get_event: { eventId: 1 },
  churchtools_get_event_agenda: { eventId: 1 },
  churchtools_list_calendars: {},
  churchtools_list_calendar_appointments: { calendar_ids: [1] },
  churchtools_list_resources: {},
  churchtools_list_bookings: { resource_ids: [1] },
  churchtools_get_booking: { bookingId: 1 },
  churchtools_search_songs: { page: 1, limit: 20 },
  churchtools_get_song: { songId: 1 },
  churchtools_search_wiki: { query: "policy" },
  churchtools_list_wiki_categories: {},
  churchtools_list_wiki_pages: { wikiCategoryId: 1 },
  churchtools_get_wiki_page: { wikiCategoryId: 1, identifier: "main" }
};

describe("read tools", () => {
  it("keeps the full dedicated read surface", () => {
    expect(readToolDefinitions.map((tool) => tool.name)).toEqual(Object.keys(sampleParams));
  });

  it("runs every dedicated read tool against the ChurchTools requester", async () => {
    const requests: ChurchToolsRequest[] = [];
    const api = {
      request: vi.fn(async (request: ChurchToolsRequest) => {
        requests.push(request);
        return { data: [] };
      })
    };

    for (const definition of readToolDefinitions) {
      const result = await runReadTool(definition, api, sampleParams[definition.name] ?? {}, testConfig);
      expect(result.isError).toBeUndefined();
    }

    expect(api.request).toHaveBeenCalledTimes(readToolDefinitions.length);
    expect(requests.map((request) => request.method).every((method) => method === "GET")).toBe(true);
    expect(requests.some((request) => request.path === "/calendars/appointments")).toBe(true);
    expect(requests.some((request) => request.path === "/bookings")).toBe(true);
  });
});
