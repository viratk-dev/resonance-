export { getDatabase, closeDatabase, clearAllData } from './db';
export { SCHEMA_VERSION } from './schema';
export {
  upsertTrack,
  getTrackById,
  getAllTracks,
  searchTracks,
  getFavoriteTracks,
  getDownloadedTracks,
  getRecentlyPlayedTracks,
  getMostPlayedTracks,
  setTrackFavorite,
  markTrackPlayed,
  setTrackDownloaded,
  deleteTrack,
  countTracks,
} from './trackRepository';
export {
  createPlaylist,
  getPlaylists,
  getPlaylistById,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  deletePlaylist,
  renamePlaylist,
  addHistoryEntry,
  getHistory,
  clearHistory,
  removeHistoryEntry,
  getLastPosition,
} from './playlistRepository';
