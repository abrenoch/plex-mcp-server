export const mcp_plex_mcp_server_get_library_contents = {
  name: "mcp_plex_mcp_server_get_library_contents",
  description: "Get the contents of a library",
  parameters: {
    type: "object",
    required: ["libraryId"],
    properties: {
      libraryId: {
        type: "string",
        description: "The ID of the library"
      },
      type: {
        type: "number",
        description: "The type of content to retrieve (1=movie, 2=show, 3=season, 4=episode)"
      },
      tag: {
        type: "string",
        enum: ["newest", "recentlyAdded", "recentlyViewed", "onDeck", "unwatched", "collection"],
        description: "The tag to filter by"
      },
      start: {
        type: "number",
        description: "Starting index for pagination (default: 0)"
      },
      size: {
        type: "number",
        description: "Number of items to return (default: 20)"
      }
    }
  }
}; 