let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Spotify token error: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export async function getSpotifyArtist(artistId: string) {
  const token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Spotify artist error: ${res.status}`);
  }

  const data = await res.json();
  return {
    followers: data.followers?.total ?? 0,
    popularity: data.popularity ?? 0,
    genres: data.genres ?? [],
    name: data.name,
    images: data.images,
  };
}

export async function getSpotifyPlaylistTracks(playlistId: string, limit = 50) {
  const token = await getAccessToken();
  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    throw new Error(`Spotify playlist error: ${res.status}`);
  }

  const data = await res.json();
  return (data.items || []).map((item: Record<string, unknown>, index: number) => {
    const track = item.track as Record<string, unknown> | null;
    if (!track) return null;
    const artists = track.artists as { name: string }[] | undefined;
    return {
      rank: index + 1,
      trackName: track.name as string,
      artistName: artists?.[0]?.name ?? "Unknown",
      popularity: track.popularity as number,
    };
  }).filter(Boolean);
}
