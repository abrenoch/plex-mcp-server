/**
 * Mock Plex client for testing when no Plex token is available
 */
export class MockPlexClient {
  async getLibraries(): Promise<any[]> {
    console.log('Mock: Getting libraries');
    const libraries = [
      { key: '1', title: 'Movies', type: 'movie' },
      { key: '2', title: 'TV Shows', type: 'show' }
    ];
    return libraries;
  }

  async getLibraryContents(libraryId: string, type: number = 1, tag: any = 'newest'): Promise<any[]> {
    console.log(`Mock: Getting library contents for library ${libraryId} with type=${type}, tag=${tag}`);
    const contents = [
      { 
        ratingKey: '101', 
        title: 'The Matrix', 
        year: 1999, 
        type: 'movie', 
        duration: 136, 
        rating: 8.7, 
        summary: 'A computer hacker learns about the true nature of reality.',
        Media: [{ optimizedForStreaming: 1 }] 
      },
      { 
        ratingKey: '102', 
        title: 'Inception', 
        year: 2010, 
        type: 'movie', 
        duration: 148, 
        rating: 8.8, 
        summary: 'A thief who steals corporate secrets through the use of dream-sharing technology.',
        Media: [{ optimizedForStreaming: 1 }]
      },
      { 
        ratingKey: '103', 
        title: 'Breaking Bad', 
        year: 2008, 
        type: 'show', 
        childCount: 5, 
        summary: 'A high school chemistry teacher turned methamphetamine manufacturer.',
        Media: [{ optimizedForStreaming: 1 }]
      },
      { 
        ratingKey: '104', 
        title: 'The Shawshank Redemption', 
        year: 1994, 
        type: 'movie', 
        duration: 142, 
        rating: 9.3, 
        summary: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
        Media: [{ optimizedForStreaming: 1 }]
      },
      { 
        ratingKey: '105', 
        title: 'The Dark Knight', 
        year: 2008, 
        type: 'movie', 
        duration: 152, 
        rating: 9.0, 
        summary: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
        Media: [{ optimizedForStreaming: 1 }]
      },
      {
        ratingKey: '301', 
        title: 'Lethal Weapon', 
        year: 1987, 
        type: 'movie',
        duration: 110,
        rating: 7.6,
        summary: 'A veteran cop reluctantly teams with a reckless partner.',
        Media: [{ optimizedForStreaming: 1 }]
      },
      {
        ratingKey: '302', 
        title: 'Lethal Weapon 2', 
        year: 1989, 
        type: 'movie',
        duration: 114,
        rating: 7.2,
        summary: 'Riggs and Murtaugh protect a federal witness.',
        Media: [{ optimizedForStreaming: 1 }]
      }
    ];
    return contents;
  }

  async getMovies(): Promise<any[]> {
    console.log('Mock: Getting movies');
    const movies = [
      { 
        ratingKey: '101', 
        title: 'The Matrix', 
        year: 1999, 
        type: 'movie', 
        duration: 136, 
        rating: 8.7, 
        summary: 'A computer hacker learns about the true nature of reality.',
        Media: [{ optimizedForStreaming: 1 }] 
      },
      { 
        ratingKey: '102', 
        title: 'Inception', 
        year: 2010, 
        type: 'movie', 
        duration: 148, 
        rating: 8.8, 
        summary: 'A thief who steals corporate secrets through the use of dream-sharing technology.',
        Media: [{ optimizedForStreaming: 1 }]
      },
      { 
        ratingKey: '104', 
        title: 'The Shawshank Redemption', 
        year: 1994, 
        type: 'movie', 
        duration: 142, 
        rating: 9.3, 
        summary: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
        Media: [{ optimizedForStreaming: 1 }]
      },
      { 
        ratingKey: '105', 
        title: 'The Dark Knight', 
        year: 2008, 
        type: 'movie', 
        duration: 152, 
        rating: 9.0, 
        summary: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
        Media: [{ optimizedForStreaming: 1 }]
      }
    ];
    return movies;
  }

  async getSeasons(showId: string): Promise<any[]> {
    console.log(`Mock: Getting seasons for show ${showId}`);
    const seasons = [
      { ratingKey: '201', title: 'Season 1', index: 1, leafCount: 10, type: 'season' },
      { ratingKey: '202', title: 'Season 2', index: 2, leafCount: 12, type: 'season' }
    ];
    return seasons;
  }

  async getEpisodes(seasonId: string): Promise<any[]> {
    console.log(`Mock: Getting episodes for season ${seasonId}`);
    const episodes = [
      { ratingKey: '301', title: 'Pilot', parentIndex: 1, index: 1, duration: 45, summary: 'First episode.', type: 'episode' },
      { ratingKey: '302', title: 'Second Episode', parentIndex: 1, index: 2, duration: 43, summary: 'Second episode.', type: 'episode' }
    ];
    return episodes;
  }

  async search(query: string): Promise<any[]> {
    console.log(`Mock: Searching for "${query}"`);
    const results = [
      {
        ratingKey: '101', 
        title: 'The Matrix', 
        year: 1999, 
        type: 'movie',
        Media: [{ optimizedForStreaming: 1 }],
        originallyAvailableAt: '1999-03-31'
      },
      {
        ratingKey: '201', 
        title: 'Breaking Bad', 
        year: 2008, 
        type: 'show',
        Media: [{ optimizedForStreaming: 1 }],
        originallyAvailableAt: '2008-01-20'
      },
      {
        ratingKey: '301', 
        title: 'Lethal Weapon', 
        year: 1987, 
        type: 'movie',
        Media: [{ optimizedForStreaming: 1 }],
        originallyAvailableAt: '1987-03-06'
      },
      {
        ratingKey: '302', 
        title: 'Lethal Weapon 2', 
        year: 1989, 
        type: 'movie',
        Media: [{ optimizedForStreaming: 1 }],
        originallyAvailableAt: '1989-07-07'
      }
    ];
    
    // Filter results based on query if provided
    if (query) {
      return results.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    return results;
  }

  async getWatchList(filter?: string): Promise<any[]> {
    console.log(`Mock: Getting watchlist${filter ? ` with filter: ${filter}` : ''}`);
    const watchlist = [
      { ratingKey: '501', title: 'Dune', year: 2021, type: 'movie', duration: 155, rating: 8.0, summary: 'A noble family becomes embroiled in a war for control over the galaxy\'s most valuable asset.' },
      { ratingKey: '502', title: 'The Last of Us', year: 2023, type: 'show', childCount: 1, summary: 'After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl who may be humanity\'s last hope.' },
      { ratingKey: '503', title: 'Oppenheimer', year: 2023, type: 'movie', duration: 180, rating: 8.5, summary: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.' }
    ];
    
    // Apply filter if provided
    if (filter?.toLowerCase() === 'available') {
      return watchlist.filter(item => item.ratingKey === '501' || item.ratingKey === '503');
    }
    
    return watchlist;
  }
} 